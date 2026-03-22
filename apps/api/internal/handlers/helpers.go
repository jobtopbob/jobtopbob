package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// getTx extracts the per-request transaction from the Gin context.
// Set by the RLS middleware.
func getTx(c *gin.Context) pgx.Tx {
	return c.MustGet("tx").(pgx.Tx)
}

// getUserID extracts the authenticated user ID from the Gin context.
func getUserID(c *gin.Context) string {
	return c.MustGet("userID").(string)
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

// splitCSV splits a comma-separated string into a slice. Returns nil for empty input.
func splitCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	if len(result) == 0 {
		return nil
	}
	return result
}

// parseUUIDs parses a comma-separated string of UUIDs into a slice.
func parseUUIDs(s string) []pgtype.UUID {
	parts := splitCSV(s)
	if parts == nil {
		return nil
	}
	uuids := make([]pgtype.UUID, 0, len(parts))
	for _, p := range parts {
		u := parseUUID(p)
		if u.Valid {
			uuids = append(uuids, u)
		}
	}
	if len(uuids) == 0 {
		return nil
	}
	return uuids
}
