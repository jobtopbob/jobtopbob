package scheduler

import (
	"log/slog"

	"github.com/hibiken/asynq"
)

// Register sets up periodic/cron tasks on the Asynq scheduler.
func Register(s *asynq.Scheduler) {
	// Renew Gmail watches every 6 days (watches expire after 7 days)
	entryID, err := s.Register("@every 144h", asynq.NewTask("email:watch-renew", nil))
	if err != nil {
		slog.Error("failed to register watch-renew cron", "error", err)
	} else {
		slog.Info("registered cron: email:watch-renew", "entry_id", entryID)
	}
}
