package services

import (
	"context"
	"encoding/json"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5/pgtype"
)

// LogActivity creates an activity log entry.
func LogActivity(ctx context.Context, q *db.Queries, userID string, entityType string, entityID pgtype.UUID, action string, oldValue, newValue any) error {
	var oldJSON, newJSON []byte
	var err error

	if oldValue != nil {
		oldJSON, err = json.Marshal(oldValue)
		if err != nil {
			return err
		}
	}
	if newValue != nil {
		newJSON, err = json.Marshal(newValue)
		if err != nil {
			return err
		}
	}

	_, err = q.CreateActivityLog(ctx, db.CreateActivityLogParams{
		UserID:     userID,
		EntityType: pgtype.Text{String: entityType, Valid: true},
		EntityID:   entityID,
		Action:     pgtype.Text{String: action, Valid: true},
		OldValue:   oldJSON,
		NewValue:   newJSON,
	})
	return err
}

// ListActivityForEntity returns activity log entries for a given entity.
func ListActivityForEntity(ctx context.Context, q *db.Queries, userID string, entityType string, entityID pgtype.UUID) ([]db.ActivityLog, error) {
	return q.ListActivityByEntity(ctx, db.ListActivityByEntityParams{
		UserID:     userID,
		EntityType: pgtype.Text{String: entityType, Valid: true},
		EntityID:   entityID,
	})
}
