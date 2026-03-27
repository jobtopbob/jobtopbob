package tasks

import (
	"compress/gzip"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/hibiken/asynq"
)

const TypeDBBackup = "db:backup"

// DBBackupDeps holds the dependencies for the backup task.
type DBBackupDeps struct {
	DatabaseURL string
}

// HandleDBBackup returns an asynq handler that runs pg_dump and retains recent backups.
func HandleDBBackup(deps *DBBackupDeps) func(context.Context, *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		backupDir := os.Getenv("BACKUP_DIR")
		if backupDir == "" {
			backupDir = "/backups"
		}

		retentionDays := 7
		if v := os.Getenv("BACKUP_RETENTION_DAYS"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				retentionDays = n
			}
		}

		// Ensure backup directory exists
		if err := os.MkdirAll(backupDir, 0o755); err != nil {
			return fmt.Errorf("create backup dir: %w", err)
		}

		timestamp := time.Now().UTC().Format("2006-01-02_150405")
		filename := fmt.Sprintf("jobtopbob_%s.sql.gz", timestamp)
		path := filepath.Join(backupDir, filename)

		slog.Info("starting database backup", "path", path)

		// Run pg_dump and pipe through gzip
		cmd := exec.CommandContext(ctx, "pg_dump", deps.DatabaseURL, "--no-owner", "--no-acl")
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			return fmt.Errorf("pg_dump stdout pipe: %w", err)
		}

		outFile, err := os.Create(path)
		if err != nil {
			return fmt.Errorf("create backup file: %w", err)
		}
		defer outFile.Close()

		gz := gzip.NewWriter(outFile)
		defer gz.Close()

		if err := cmd.Start(); err != nil {
			os.Remove(path)
			return fmt.Errorf("pg_dump start: %w", err)
		}

		buf := make([]byte, 32*1024)
		for {
			n, readErr := stdout.Read(buf)
			if n > 0 {
				if _, writeErr := gz.Write(buf[:n]); writeErr != nil {
					cmd.Process.Kill()
					os.Remove(path)
					return fmt.Errorf("gzip write: %w", writeErr)
				}
			}
			if readErr != nil {
				break
			}
		}

		if err := cmd.Wait(); err != nil {
			os.Remove(path)
			return fmt.Errorf("pg_dump failed: %w", err)
		}

		if err := gz.Close(); err != nil {
			return fmt.Errorf("gzip close: %w", err)
		}
		if err := outFile.Close(); err != nil {
			return fmt.Errorf("file close: %w", err)
		}

		info, _ := os.Stat(path)
		slog.Info("database backup completed", "path", path, "size_bytes", info.Size())

		// Prune old backups
		pruneBackups(backupDir, retentionDays)

		return nil
	}
}

// pruneBackups removes backup files older than retentionDays.
func pruneBackups(dir string, retentionDays int) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		slog.Warn("failed to read backup directory for pruning", "error", err)
		return
	}

	var backups []os.DirEntry
	for _, e := range entries {
		if !e.IsDir() && strings.HasPrefix(e.Name(), "jobtopbob_") && strings.HasSuffix(e.Name(), ".sql.gz") {
			backups = append(backups, e)
		}
	}

	if len(backups) <= retentionDays {
		return
	}

	// Sort by name (which includes timestamp) ascending
	sort.Slice(backups, func(i, j int) bool {
		return backups[i].Name() < backups[j].Name()
	})

	// Remove oldest, keeping retentionDays most recent
	toRemove := backups[:len(backups)-retentionDays]
	for _, b := range toRemove {
		path := filepath.Join(dir, b.Name())
		if err := os.Remove(path); err != nil {
			slog.Warn("failed to remove old backup", "path", path, "error", err)
		} else {
			slog.Info("pruned old backup", "path", path)
		}
	}
}
