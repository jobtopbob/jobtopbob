package services

import (
	"context"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5/pgtype"
)

// ListTags returns all tags for a user.
func ListTags(ctx context.Context, q *db.Queries, userID pgtype.UUID) ([]db.Tag, error) {
	return q.ListTags(ctx, userID)
}

// CreateTag creates a new tag.
func CreateTag(ctx context.Context, q *db.Queries, userID pgtype.UUID, name string, color string) (db.Tag, error) {
	return q.CreateTag(ctx, db.CreateTagParams{
		UserID: userID,
		Name:   pgtype.Text{String: name, Valid: name != ""},
		Color:  pgtype.Text{String: color, Valid: color != ""},
	})
}

// DeleteTag deletes a tag.
func DeleteTag(ctx context.Context, q *db.Queries, userID pgtype.UUID, id pgtype.UUID) (int64, error) {
	result, err := q.DeleteTag(ctx, db.DeleteTagParams{ID: id, UserID: userID})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// AssignTag creates a tagging between a tag and an entity.
func AssignTag(ctx context.Context, q *db.Queries, userID pgtype.UUID, tagID pgtype.UUID, entityType string, entityID pgtype.UUID) error {
	return q.CreateTagging(ctx, db.CreateTaggingParams{
		UserID:     userID,
		TagID:      tagID,
		EntityType: entityType,
		EntityID:   entityID,
	})
}

// RemoveTag removes a tagging between a tag and an entity.
func RemoveTag(ctx context.Context, q *db.Queries, userID pgtype.UUID, tagID pgtype.UUID, entityType string, entityID pgtype.UUID) (int64, error) {
	result, err := q.DeleteTagging(ctx, db.DeleteTaggingParams{
		UserID:     userID,
		TagID:      tagID,
		EntityType: entityType,
		EntityID:   entityID,
	})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// ListTagsForJob returns all tags assigned to a job.
func ListTagsForJob(ctx context.Context, q *db.Queries, userID pgtype.UUID, jobID pgtype.UUID) ([]db.Tag, error) {
	return q.ListTagsForEntity(ctx, db.ListTagsForEntityParams{
		UserID:     userID,
		EntityType: "job",
		EntityID:   jobID,
	})
}
