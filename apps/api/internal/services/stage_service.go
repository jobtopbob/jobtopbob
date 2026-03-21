package services

import (
	"context"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5/pgtype"
)

// ListStages returns all stages for a user, ordered by position.
// If the user has no stages, default stages are seeded automatically.
func ListStages(ctx context.Context, q *db.Queries, userID string) ([]db.Stage, error) {
	stages, err := q.ListStages(ctx, userID)
	if err != nil {
		return nil, err
	}
	if len(stages) == 0 {
		if err := q.SeedDefaultStages(ctx, userID); err != nil {
			return nil, err
		}
		return q.ListStages(ctx, userID)
	}
	return stages, nil
}

// CreateStage creates a new pipeline stage.
func CreateStage(ctx context.Context, q *db.Queries, userID string, params db.CreateStageParams) (db.Stage, error) {
	params.UserID = userID
	return q.CreateStage(ctx, params)
}

// UpdateStage updates a stage's properties.
func UpdateStage(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, params db.UpdateStageParams) (db.Stage, error) {
	params.ID = id
	params.UserID = userID
	return q.UpdateStage(ctx, params)
}

// DeleteStage deletes a stage.
func DeleteStage(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (int64, error) {
	result, err := q.DeleteStage(ctx, db.DeleteStageParams{ID: id, UserID: userID})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// ReorderStage holds the ID and new position for a reorder operation.
type ReorderStage struct {
	ID       pgtype.UUID `json:"id"`
	Position int32       `json:"position"`
}

// ReorderStages updates positions for all provided stages within a single transaction.
func ReorderStages(ctx context.Context, q *db.Queries, userID string, stages []ReorderStage) error {
	for _, s := range stages {
		if err := q.UpdateStagePosition(ctx, db.UpdateStagePositionParams{
			Position: s.Position,
			ID:       s.ID,
			UserID:   userID,
		}); err != nil {
			return err
		}
	}
	return nil
}

// SeedDefaultStages creates the default pipeline stages for a new user.
func SeedDefaultStages(ctx context.Context, q *db.Queries, userID string) error {
	return q.SeedDefaultStages(ctx, userID)
}
