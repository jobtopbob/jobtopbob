package router

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jobtopbob/jobtopbob/apps/api/internal/handlers"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/middleware"
)

// New creates a configured Gin engine with all routes and middleware.
func New(pool *pgxpool.Pool, jwksURL string, corsOrigins []string) *gin.Engine {
	r := gin.New()

	// Global middleware
	r.Use(middleware.Logging())
	r.Use(middleware.CORS(corsOrigins))
	r.Use(gin.Recovery())

	// Public routes
	r.GET("/health", handlers.Health())

	// Authenticated routes
	v1 := r.Group("/api/v1")
	v1.Use(middleware.Auth(jwksURL))
	v1.Use(middleware.RLS(pool))
	{
		// Route handlers will be registered here as they're built
		_ = v1
	}

	return r
}
