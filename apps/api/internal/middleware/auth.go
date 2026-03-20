package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const userIDKey contextKey = "userID"

// UserIDFromContext extracts the authenticated user ID from the context.
func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDKey).(string)
	return id, ok
}

// Auth returns middleware that validates JWT Bearer tokens via JWKS.
func Auth(jwksURL string) gin.HandlerFunc {
	k, err := keyfunc.NewDefault([]string{jwksURL})
	if err != nil {
		slog.Error("failed to create JWKS keyfunc", "error", err)
		panic("failed to initialize JWKS keyfunc: " + err.Error())
	}

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or invalid authorization header"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenString, k.KeyfuncCtx(c.Request.Context()),
			jwt.WithValidMethods([]string{"RS256", "ES256"}),
		)
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		sub, err := token.Claims.GetSubject()
		if err != nil || sub == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing subject claim"})
			return
		}

		// Store userID in both Gin context and request context
		c.Set(string(userIDKey), sub)
		ctx := context.WithValue(c.Request.Context(), userIDKey, sub)
		c.Request = c.Request.WithContext(ctx)

		c.Next()
	}
}
