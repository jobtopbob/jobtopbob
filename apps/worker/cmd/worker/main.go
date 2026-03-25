package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

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

	// Create AI provider
	var aiProvider ai.Provider
	if cfg.AIAPIKey != "" {
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
		slog.Warn("no AI API key configured — email classification will be disabled")
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
