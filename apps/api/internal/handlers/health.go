package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Health returns the health check handler.
func Health() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}
