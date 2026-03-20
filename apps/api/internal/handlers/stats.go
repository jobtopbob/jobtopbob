package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	db "github.com/jobtopbob/jobtopbob/apps/api/db/generated"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services"
)

// GetStats handles GET /api/v1/stats
func GetStats() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := db.New(getTx(c))
		userID := getUserID(c)

		stats, err := services.GetStats(c.Request.Context(), q, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
			return
		}

		c.JSON(http.StatusOK, stats)
	}
}
