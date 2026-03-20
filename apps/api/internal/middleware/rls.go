package middleware

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// txKey is the Gin context key for the per-request transaction.
const txKey = "tx"

// RLS returns middleware that wraps each request in a database transaction
// with SET LOCAL app.current_user_id for row-level security.
func RLS(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get(string(userIDKey))
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
			return
		}

		tx, err := pool.Begin(c.Request.Context())
		if err != nil {
			slog.Error("failed to begin transaction", "error", err)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		// Set the current user ID for RLS policies.
		// This is safe from injection because userID comes from a validated JWT sub claim.
		_, err = tx.Exec(c.Request.Context(), fmt.Sprintf("SET LOCAL app.current_user_id = '%s'", userID))
		if err != nil {
			slog.Error("failed to set current_user_id", "error", err)
			_ = tx.Rollback(c.Request.Context())
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
			return
		}

		c.Set(txKey, tx)

		c.Next()

		if len(c.Errors) > 0 || c.Writer.Status() >= 400 {
			if rbErr := tx.Rollback(c.Request.Context()); rbErr != nil {
				slog.Error("failed to rollback transaction", "error", rbErr)
			}
		} else {
			if cmErr := tx.Commit(c.Request.Context()); cmErr != nil {
				slog.Error("failed to commit transaction", "error", cmErr)
			}
		}
	}
}
