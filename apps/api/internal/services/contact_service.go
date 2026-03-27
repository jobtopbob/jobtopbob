package services

import (
	"context"
	"errors"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// GetContact returns a single contact with its company name joined.
func GetContact(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (db.GetContactRow, error) {
	row, err := q.GetContact(ctx, db.GetContactParams{ID: id, UserID: userID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// ListContactsParams holds all filter/pagination parameters for listing contacts.
type ListContactsParams struct {
	Statuses  []string
	Sources   []string
	CompanyID pgtype.UUID
	Search    pgtype.Text
	SortBy    string
	SortOrder string
	Page      int32
	PerPage   int32
}

// ListContactsResult holds the paginated result.
type ListContactsResult struct {
	Data    []db.ListContactsRow `json:"data"`
	Total   int64                `json:"total"`
	Page    int32                `json:"page"`
	PerPage int32                `json:"per_page"`
}

// ListContacts returns a paginated, filtered list of contacts.
func ListContacts(ctx context.Context, q *db.Queries, userID string, p ListContactsParams) (ListContactsResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 {
		p.PerPage = 10
	} else if p.PerPage > 500 {
		p.PerPage = 500
	}
	if p.SortBy == "" {
		p.SortBy = "name"
	}
	if p.SortOrder == "" {
		p.SortOrder = "asc"
	}

	offset := (p.Page - 1) * p.PerPage

	total, err := q.CountContacts(ctx, db.CountContactsParams{
		UserID:    userID,
		Statuses:  p.Statuses,
		Sources:   p.Sources,
		CompanyID: p.CompanyID,
		Search:    p.Search,
	})
	if err != nil {
		return ListContactsResult{}, err
	}

	contacts, err := q.ListContacts(ctx, db.ListContactsParams{
		UserID:    userID,
		Limit:     p.PerPage,
		Offset:    offset,
		Statuses:  p.Statuses,
		Sources:   p.Sources,
		CompanyID: p.CompanyID,
		Search:    p.Search,
		SortBy:    p.SortBy,
		SortOrder: p.SortOrder,
	})
	if err != nil {
		return ListContactsResult{}, err
	}

	return ListContactsResult{
		Data:    contacts,
		Total:   total,
		Page:    p.Page,
		PerPage: p.PerPage,
	}, nil
}

// CreateContact creates a new contact.
func CreateContact(ctx context.Context, q *db.Queries, userID string, params db.CreateContactParams) (db.Contact, error) {
	params.UserID = userID
	return q.CreateContact(ctx, params)
}

// UpdateContact updates a contact's fields.
func UpdateContact(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID, params db.UpdateContactParams) (db.Contact, error) {
	params.ID = id
	params.UserID = userID
	row, err := q.UpdateContact(ctx, params)
	if errors.Is(err, pgx.ErrNoRows) {
		return row, ErrNotFound
	}
	return row, err
}

// DeleteContact deletes a contact by ID.
func DeleteContact(ctx context.Context, q *db.Queries, userID string, id pgtype.UUID) (int64, error) {
	result, err := q.DeleteContact(ctx, db.DeleteContactParams{ID: id, UserID: userID})
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

// SearchContacts searches contacts by name or email substring.
func SearchContacts(ctx context.Context, q *db.Queries, userID string, query string) ([]db.SearchContactsRow, error) {
	return q.SearchContacts(ctx, db.SearchContactsParams{
		UserID:  userID,
		Column2: pgtype.Text{String: query, Valid: true},
	})
}
