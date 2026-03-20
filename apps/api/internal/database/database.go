package database

import (
	"context"
	"embed"
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool creates a pgx connection pool.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}
	return pool, nil
}

// RunMigrations runs all pending database migrations using the embedded FS.
func RunMigrations(databaseURL string, migrationsFS embed.FS) error {
	d, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("unable to create iofs source: %w", err)
	}

	// golang-migrate's pgx driver requires pgx5:// scheme
	dbURL := toPgxScheme(databaseURL)

	m, err := migrate.NewWithSourceInstance("iofs", d, dbURL)
	if err != nil {
		return fmt.Errorf("unable to create migrate instance: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration failed: %w", err)
	}
	return nil
}

// toPgxScheme converts postgres:// or postgresql:// URLs to pgx5:// for golang-migrate.
func toPgxScheme(url string) string {
	if strings.HasPrefix(url, "postgres://") {
		return "pgx5" + url[len("postgres"):]
	}
	if strings.HasPrefix(url, "postgresql://") {
		return "pgx5" + url[len("postgresql"):]
	}
	return url
}
