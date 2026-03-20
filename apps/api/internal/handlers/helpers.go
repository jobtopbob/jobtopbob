package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// getTx extracts the per-request transaction from the Gin context.
// Set by the RLS middleware.
func getTx(c *gin.Context) pgx.Tx {
	return c.MustGet("tx").(pgx.Tx)
}

// getUserID extracts the authenticated user ID from the Gin context
// and returns it as a pgtype.UUID.
func getUserID(c *gin.Context) pgtype.UUID {
	id := c.MustGet("userID").(string)
	return parseUUID(id)
}

// parseUUID parses a string into a pgtype.UUID.
func parseUUID(s string) pgtype.UUID {
	var u pgtype.UUID
	_ = u.Scan(s)
	return u
}

// parsePathUUID parses a UUID from a URL path parameter.
// Returns false and sends a 400 response if the UUID is invalid.
func parsePathUUID(c *gin.Context, param string) (pgtype.UUID, bool) {
	s := c.Param(param)
	u := parseUUID(s)
	if !u.Valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid " + param})
		return u, false
	}
	return u, true
}

// pgtextValid returns a pgtype.Text with Valid=true if the string is non-empty.
func pgtextValid(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}
