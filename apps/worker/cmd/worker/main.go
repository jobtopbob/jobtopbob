package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/jobtopbob/jobtopbob/apps/worker/internal/config"
	"github.com/jobtopbob/jobtopbob/apps/worker/internal/scheduler"
	"github.com/jobtopbob/jobtopbob/apps/worker/internal/tasks"
	"github.com/jobtopbob/jobtopbob/internal/ai"
	"github.com/jobtopbob/jobtopbob/internal/ai/providers"
	"github.com/jobtopbob/jobtopbob/internal/crypto"
	"github.com/jobtopbob/jobtopbob/internal/email"
	"github.com/jobtopbob/jobtopbob/internal/email/gmail"
	"github.com/jobtopbob/jobtopbob/internal/enrichment"
	"github.com/jobtopbob/jobtopbob/internal/storage"
)

func main() {
	ctx := context.Background()

	cfg := config.Load()

	// Parse encryption key
	masterKey, err := crypto.ParseMasterKey(cfg.EncryptionKey)
	if err != nil {
		slog.Error("invalid API_ENCRYPTION_KEY", "error", err)
		os.Exit(1)
	}

	// Create database pool
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to create database pool", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Create Redis client
	redisOpts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		slog.Error("failed to parse redis URL", "error", err)
		os.Exit(1)
	}
	rdb := redis.NewClient(redisOpts)
	defer rdb.Close()

	// Create email provider
	pubSubTopic := ""
	if cfg.GoogleCloudProjectID != "" && cfg.PubSubTopicName != "" {
		pubSubTopic = fmt.Sprintf("projects/%s/topics/%s", cfg.GoogleCloudProjectID, cfg.PubSubTopicName)
	}
	var emailProvider email.Provider = gmail.New(gmail.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURI:  cfg.GoogleRedirectURI,
		PubSubTopic:  pubSubTopic,
	})

	// Create AI provider (optional — only if an API key is configured, or Ollama)
	var aiProvider ai.Provider
	if cfg.AIAPIKey != "" || cfg.AIProvider == "ollama" {
		aiProvider, err = providers.New(ai.ProviderConfig{
			Provider: cfg.AIProvider,
			APIKey:   cfg.AIAPIKey,
			BaseURL:  cfg.AIBaseURL,
			Model:    cfg.AIModel,
		})
		if err != nil {
			slog.Error("failed to create AI provider", "error", err)
			os.Exit(1)
		}
	} else {
		slog.Warn("no AI API key configured — AI features will be disabled", "provider", cfg.AIProvider, "hint", aiKeyHint(cfg.AIProvider))
	}

	// Create Asynq Redis connection
	asynqRedis := asynq.RedisClientOpt{
		Addr:     rdb.Options().Addr,
		Password: rdb.Options().Password,
		DB:       rdb.Options().DB,
	}

	// Create Asynq server (task consumer)
	srv := asynq.NewServer(asynqRedis, asynq.Config{
		Concurrency: 10,
		Queues: map[string]int{
			"default": 1,
		},
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			slog.Error("asynq task failed",
				"type", task.Type(),
				"error", err,
				"payload", string(task.Payload()),
			)
		}),
	})

	// Register task handlers
	mux := asynq.NewServeMux()

	emailDeps := &tasks.EmailProcessDeps{
		Pool:          pool,
		MasterKey:     masterKey,
		EmailProvider: emailProvider,
		AIProvider:    aiProvider,
		Redis:         rdb,
	}
	mux.HandleFunc(tasks.TypeEmailProcess, tasks.HandleEmailProcess(emailDeps))

	watchDeps := &tasks.WatchRenewDeps{
		Pool:          pool,
		MasterKey:     masterKey,
		EmailProvider: emailProvider,
	}
	mux.HandleFunc(tasks.TypeEmailWatchRenew, tasks.HandleWatchRenew(watchDeps))

	// Initialize S3-compatible storage (RustFS) for logo uploads
	var store *storage.Client
	if cfg.S3Endpoint != "" {
		store, err = storage.New(ctx, storage.Config{
			Bucket:    cfg.S3Bucket,
			Region:    cfg.S3Region,
			Endpoint:  cfg.S3Endpoint,
			AccessKey: cfg.S3AccessKey,
			SecretKey: cfg.S3SecretKey,
		})
		if err != nil {
			slog.Warn("failed to initialize storage for worker — logo storage disabled", "error", err)
		}
	}

	// Build enrichment provider registry (priority order: PDL > favicon > webscrape)
	var enrichProviders []enrichment.Provider
	httpClient := &http.Client{Timeout: 15 * time.Second}

	if cfg.PDLAPIKey != "" {
		enrichProviders = append(enrichProviders, &enrichment.PDL{
			APIKey: cfg.PDLAPIKey,
			Client: httpClient,
		})
		slog.Info("enrichment provider registered", "provider", "pdl")
	}
	enrichProviders = append(enrichProviders, &enrichment.Favicon{Client: httpClient})
	if aiProvider != nil {
		enrichProviders = append(enrichProviders, &enrichment.WebScrape{
			AIProvider: aiProvider,
			Client:     httpClient,
		})
		slog.Info("enrichment provider registered", "provider", "webscrape")
	}

	enrichDeps := &tasks.CompanyEnrichDeps{
		Pool:       pool,
		Redis:      rdb,
		Store:      store,
		HTTPClient: httpClient,
		Providers:  enrichProviders,
	}
	mux.HandleFunc(tasks.TypeCompanyEnrich, tasks.HandleCompanyEnrich(enrichDeps))

	// Database backup
	backupDeps := &tasks.DBBackupDeps{
		DatabaseURL: cfg.DatabaseURL,
	}
	mux.HandleFunc(tasks.TypeDBBackup, tasks.HandleDBBackup(backupDeps))

	// AI tasks (independent of scrapers)
	if aiProvider != nil {
		resumeDeps := &tasks.ResumeAnalyzeDeps{
			Pool:       pool,
			Redis:      rdb,
			AIProvider: aiProvider,
		}
		mux.HandleFunc(tasks.TypeResumeAnalyze, tasks.HandleResumeAnalyze(resumeDeps))

		jobExtractDeps := &tasks.JobExtractDeps{
			Pool:       pool,
			Redis:      rdb,
			AIProvider: aiProvider,
		}
		mux.HandleFunc(tasks.TypeJobExtract, tasks.HandleJobExtract(jobExtractDeps))

		jobScoreDeps := &tasks.JobScoreDeps{
			Pool:       pool,
			Redis:      rdb,
			AIProvider: aiProvider,
		}
		mux.HandleFunc(tasks.TypeJobScore, tasks.HandleJobScore(jobScoreDeps))

		slog.Info("AI tasks registered", "tasks", []string{tasks.TypeResumeAnalyze, tasks.TypeJobExtract, tasks.TypeJobScore})
	}

	// Scraper tasks (conditional on SCRAPERS_ENABLED)
	if cfg.ScrapersEnabled {
		asynqClient := asynq.NewClient(asynqRedis)
		defer asynqClient.Close()

		scraperURLs := make(map[string]string)
		if cfg.ScraperAdzunaURL != "" {
			scraperURLs["adzuna"] = cfg.ScraperAdzunaURL
		}
		if cfg.ScraperSerpURL != "" {
			scraperURLs["serp"] = cfg.ScraperSerpURL
		}

		dispatchDeps := &tasks.ScrapeDispatchDeps{
			Pool:        pool,
			Redis:       rdb,
			AsynqClient: asynqClient,
			ScraperURLs: scraperURLs,
		}
		mux.HandleFunc(tasks.TypeScrapeDispatch, tasks.HandleScrapeDispatch(dispatchDeps))

		sourceDeps := &tasks.ScrapeSourceDeps{
			Pool:       pool,
			Redis:      rdb,
			HTTPClient: httpClient,
		}
		mux.HandleFunc(tasks.TypeScrapeSource, tasks.HandleScrapeSource(sourceDeps))

		slog.Info("scraper tasks registered", "sources", fmt.Sprintf("%v", scraperURLs))
	}

	// Start Asynq server
	go func() {
		slog.Info("starting asynq worker")
		if err := srv.Start(mux); err != nil {
			slog.Error("asynq server error", "error", err)
			os.Exit(1)
		}
	}()

	// Create and start Asynq scheduler (cron jobs)
	sched := asynq.NewScheduler(asynqRedis, nil)
	scheduler.Register(sched)

	go func() {
		slog.Info("starting asynq scheduler")
		if err := sched.Start(); err != nil {
			slog.Error("asynq scheduler error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for shutdown signal
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	slog.Info("shutting down worker")
	srv.Shutdown()
	sched.Shutdown()
	slog.Info("worker stopped")
}

func aiKeyHint(provider string) string {
	switch provider {
	case "openai":
		return "set OPENAI_API_KEY"
	case "anthropic":
		return "set ANTHROPIC_API_KEY"
	case "gemini":
		return "set GOOGLE_API_KEY"
	case "openrouter":
		return "set OPENROUTER_API_KEY"
	case "ollama":
		return "no key needed"
	default:
		return "set the API key for your provider"
	}
}
