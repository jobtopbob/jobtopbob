package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// GetJobActivity handles GET /api/v1/jobs/:id/activity
func GetJobActivity() gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID, ok := parsePathUUID(c, "id")
		if !ok {
			return
		}

		q := db.New(getTx(c))
		userID := getUserID(c)

		entries, err := services.ListActivityForEntity(c.Request.Context(), q, userID, "job", jobID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list activity"})
			return
		}

		c.JSON(http.StatusOK, entries)
	}
}
