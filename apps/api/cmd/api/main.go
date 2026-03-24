package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"

	"github.com/jobtopbob/jobtopbob/apps/api/db"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/config"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/database"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/router"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/seed"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
	"github.com/jobtopbob/jobtopbob/internal/storage"
)

func main() {
	ctx := context.Background()

	// Load .env.local if present (host-specific overrides, does not override existing env vars).
	// .env.local is gitignored and safe for host-based dev (localhost URLs).
	// The root .env is Docker-oriented (service hostnames like redis, web) and should NOT
	// be loaded when running on the host.
	_ = godotenv.Load(".env.local", "../../.env.local")

	// Load config
	cfg := config.Load()

	// Run embedded migrations (uses superuser for DDL privileges)
	slog.Info("running database migrations")
	if err := database.RunMigrations(cfg.MigrationDatabaseURL, db.MigrationsFS); err != nil {
		slog.Error("migrations failed", "error", err)
		os.Exit(1)
	}
	slog.Info("migrations complete")

	// Create database connection pool
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to create database pool", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Initialize S3-compatible storage (RustFS)
	store, err := storage.New(ctx, storage.Config{
		Bucket:    cfg.S3Bucket,
		Region:    cfg.S3Region,
		Endpoint:  cfg.S3Endpoint,
		AccessKey: cfg.S3AccessKey,
		SecretKey: cfg.S3SecretKey,
	})
	if err != nil {
		slog.Error("failed to initialize storage", "error", err)
		os.Exit(1)
	}

	// Seed demo data if enabled
	if cfg.SeedDemoData {
		if err := seed.SeedDemoData(ctx, pool, store); err != nil {
			slog.Warn("demo seed failed", "error", err)
		}
	}

	// Create Redis client
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		slog.Error("failed to parse redis URL", "error", err)
		os.Exit(1)
	}
	rdb := redis.NewClient(opts)
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}

	// Create RxResume client (API-only, per-user API keys stored in user_settings)
	rxClient := rxresume.NewClient(cfg.ResumeBuilderURL, cfg.ResumePrinterHTTPURL, cfg.ResumeBuilderPrinterURL)

	// Create router
	engine := router.New(pool, cfg.JWKSURL, cfg.CORSOrigins, rxClient, cfg.ResumeBuilderPublicURL)

	// Start HTTP server with graceful shutdown
	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: engine,
	}

	go func() {
		slog.Info("starting server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server")
	shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}
	slog.Info("server stopped")
}
