package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
	"github.com/jobtopbob/jobtopbob/internal/storage"
)

// ListContacts handles GET /api/v1/contacts
func ListContacts() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

		params := services.ListContactsParams{
			Statuses:  splitCSV(c.Query("statuses")),
			Sources:   splitCSV(c.Query("sources")),
			Search:    pgtextValid(c.Query("search")),
			SortBy:    c.DefaultQuery("sort_by", "name"),
			SortOrder: c.DefaultQuery("sort_order", "asc"),
			Page:      int32(page),
			PerPage:   int32(perPage),
		}

		if s := c.Query("company_id"); s != "" {
			params.CompanyID = parseUUID(s)
		}

		result, err := services.ListContacts(c.Request.Context(), q, userID, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list contacts"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// GetContact handles GET /api/v1/contacts/:id
func GetContact() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		contact, err := services.GetContact(c.Request.Context(), q, userID, id)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get contact"})
			return
		}

		c.JSON(http.StatusOK, contact)
	}
}

type createContactRequest struct {
	Name        string  `json:"name" binding:"required"`
	CompanyID   *string `json:"company_id"`
	Role        string  `json:"role"`
	Email       string  `json:"email"`
	LinkedinURL string  `json:"linkedin_url"`
	Source      string  `json:"source"`
	Status      string  `json:"status"`
	Notes       string  `json:"notes"`
	LastContact *string `json:"last_contact"`
}

// CreateContact handles POST /api/v1/contacts
func CreateContact() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createContactRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		params := db.CreateContactParams{
			Name:        req.Name,
			Role:        pgtextValid(req.Role),
			Email:       pgtextValid(req.Email),
			LinkedinUrl: pgtextValid(req.LinkedinURL),
			Source:      pgtextValid(req.Source),
			Status:      pgtextValid(req.Status),
			Notes:       pgtextValid(req.Notes),
		}
		if req.CompanyID != nil {
			params.CompanyID = parseUUID(*req.CompanyID)
		}
		if req.LastContact != nil {
			if t, err := time.Parse(time.RFC3339, *req.LastContact); err == nil {
				params.LastContact = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}

		contact, err := services.CreateContact(c.Request.Context(), q, userID, params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create contact"})
			return
		}

		c.JSON(http.StatusCreated, contact)
	}
}

type updateContactRequest struct {
	Name        *string `json:"name"`
	CompanyID   *string `json:"company_id"`
	Role        *string `json:"role"`
	Email       *string `json:"email"`
	LinkedinURL *string `json:"linkedin_url"`
	Source      *string `json:"source"`
	Status      *string `json:"status"`
	Notes       *string `json:"notes"`
	LastContact *string `json:"last_contact"`
}

// UpdateContact handles PUT /api/v1/contacts/:id
func UpdateContact() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		var req updateContactRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		// If company_id is explicitly set to empty string, clear it
		if req.CompanyID != nil && *req.CompanyID == "" {
			_ = q.UpdateContactCompanyID(c.Request.Context(), db.UpdateContactCompanyIDParams{
				ID:     id,
				UserID: userID,
			})
		}

		var params db.UpdateContactParams
		if req.Name != nil {
			params.Name = pgtextValid(*req.Name)
		}
		if req.CompanyID != nil && *req.CompanyID != "" {
			params.CompanyID = parseUUID(*req.CompanyID)
		}
		if req.Role != nil {
			params.Role = pgtextValid(*req.Role)
		}
		if req.Email != nil {
			params.Email = pgtextValid(*req.Email)
		}
		if req.LinkedinURL != nil {
			params.LinkedinUrl = pgtextValid(*req.LinkedinURL)
		}
		if req.Source != nil {
			params.Source = pgtextValid(*req.Source)
		}
		if req.Status != nil {
			params.Status = pgtextValid(*req.Status)
		}
		if req.Notes != nil {
			params.Notes = pgtextValid(*req.Notes)
		}
		if req.LastContact != nil {
			if t, err := time.Parse(time.RFC3339, *req.LastContact); err == nil {
				params.LastContact = pgtype.Timestamptz{Time: t, Valid: true}
			}
		}

		contact, err := services.UpdateContact(c.Request.Context(), q, userID, id, params)
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update contact"})
			return
		}

		c.JSON(http.StatusOK, contact)
	}
}

// DeleteContact handles DELETE /api/v1/contacts/:id
func DeleteContact() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		rows, err := services.DeleteContact(c.Request.Context(), q, userID, id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete contact"})
			return
		}
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
			return
		}

		c.Status(http.StatusNoContent)
	}
}

// SearchContacts handles GET /api/v1/contacts/search?q=
func SearchContacts() gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		contacts, err := services.SearchContacts(c.Request.Context(), q, userID, query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to search contacts"})
			return
		}

		c.JSON(http.StatusOK, contacts)
	}
}

// contactAvatarKey returns the storage key for a contact's avatar.
func contactAvatarKey(contactID, ext string) string {
	return fmt.Sprintf("avatars/contacts/%s%s", contactID, ext)
}

// UploadContactAvatar handles POST /api/v1/contacts/:id/avatar
func UploadContactAvatar(store *storage.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		if store == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "storage not configured"})
			return
		}

		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
			return
		}
		defer file.Close()

		if header.Size > maxLogoSize {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file too large, maximum 5 MB"})
			return
		}

		contentType := header.Header.Get("Content-Type")
		ext, valid := allowedLogoTypes[contentType]
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image type, use JPEG, PNG, WebP, GIF, or SVG"})
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		// Verify contact belongs to user
		_, err = q.GetContact(c.Request.Context(), db.GetContactParams{ID: id, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
			return
		}

		// Delete old avatar files with different extensions
		idStr := fmt.Sprintf("%x-%x-%x-%x-%x", id.Bytes[0:4], id.Bytes[4:6], id.Bytes[6:8], id.Bytes[8:10], id.Bytes[10:16])
		for _, e := range allowedLogoTypes {
			if e != ext {
				_ = store.Delete(c.Request.Context(), contactAvatarKey(idStr, e))
			}
		}

		key := contactAvatarKey(idStr, ext)
		url, err := store.Upload(c.Request.Context(), key, file, contentType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload avatar"})
			return
		}

		// Update contact avatar_url
		_, err = q.UpdateContactAvatarURL(c.Request.Context(), db.UpdateContactAvatarURLParams{
			ID:        id,
			UserID:    userID,
			AvatarUrl: pgtype.Text{String: url, Valid: true},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save avatar URL"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": url})
	}
}

// DeleteContactAvatar handles DELETE /api/v1/contacts/:id/avatar
func DeleteContactAvatar(store *storage.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		contact, err := q.GetContact(c.Request.Context(), db.GetContactParams{ID: id, UserID: userID})
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "contact not found"})
			return
		}

		// Delete from storage
		if contact.AvatarUrl.Valid && store != nil {
			idStr := fmt.Sprintf("%x-%x-%x-%x-%x", id.Bytes[0:4], id.Bytes[4:6], id.Bytes[6:8], id.Bytes[8:10], id.Bytes[10:16])
			for _, ext := range allowedLogoTypes {
				_ = store.Delete(c.Request.Context(), contactAvatarKey(idStr, ext))
			}
		}

		// Clear avatar_url
		_, err = q.UpdateContactAvatarURL(c.Request.Context(), db.UpdateContactAvatarURLParams{
			ID:     id,
			UserID: userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove avatar"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": ""})
	}
}
