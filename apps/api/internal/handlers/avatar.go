package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/internal/storage"
)

const maxAvatarSize = 5 << 20 // 5 MB

var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// avatarKey returns the storage key for a user's avatar.
func avatarKey(userID, ext string) string {
	return fmt.Sprintf("avatars/%s%s", userID, ext)
}

// UploadAvatar handles POST /api/v1/settings/avatar
// Accepts a multipart file upload, stores it in RustFS, and updates the user's image URL.
func UploadAvatar(store *storage.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := getUserID(c)

		file, header, err := c.Request.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
			return
		}
		defer file.Close()

		if header.Size > maxAvatarSize {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file too large, maximum 5 MB"})
			return
		}

		contentType := header.Header.Get("Content-Type")
		ext, ok := allowedImageTypes[contentType]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image type, use JPEG, PNG, WebP, or GIF"})
			return
		}

		// Delete any existing avatar with a different extension
		for _, e := range allowedImageTypes {
			if e != ext {
				_ = store.Delete(c.Request.Context(), avatarKey(userID, e))
			}
		}

		key := avatarKey(userID, ext)
		url, err := store.Upload(c.Request.Context(), key, file, contentType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload avatar"})
			return
		}

		// Update user.image in database
		q := db.New(getTx(c))
		if err := q.UpdateUserImage(c.Request.Context(), db.UpdateUserImageParams{
			ID:    userID,
			Image: pgtype.Text{String: url, Valid: true},
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save avatar URL"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": url})
	}
}

// DeleteAvatar handles DELETE /api/v1/settings/avatar
// Removes the avatar from RustFS and clears the user's image URL.
func DeleteAvatar(store *storage.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := getUserID(c)
		q := db.New(getTx(c))

		// Get current image URL to determine storage key
		image, err := q.GetUserImage(c.Request.Context(), userID)
		if err == nil && image.Valid && image.String != "" {
			// Extract extension from URL
			ext := strings.ToLower(filepath.Ext(image.String))
			if ext != "" {
				_ = store.Delete(c.Request.Context(), avatarKey(userID, ext))
			}
		}

		// Clear image in database
		if err := q.UpdateUserImage(c.Request.Context(), db.UpdateUserImageParams{
			ID:    userID,
			Image: pgtype.Text{},
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove avatar"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"url": ""})
	}
}
