package router

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jobtopbob/jobtopbob/apps/api/internal/handlers"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/middleware"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
)

// New creates a configured Gin engine with all routes and middleware.
func New(pool *pgxpool.Pool, jwksURL string, corsOrigins []string, rxClient *rxresume.Client, builderPublicURL string) *gin.Engine {
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
		// Jobs
		v1.GET("/jobs", handlers.ListJobs())
		v1.POST("/jobs", handlers.CreateJob())
		v1.POST("/jobs/import", handlers.ImportJob())
		v1.PATCH("/jobs/bulk", handlers.BulkUpdate())
		v1.GET("/jobs/:id", handlers.GetJob())
		v1.PUT("/jobs/:id", handlers.UpdateJob())
		v1.DELETE("/jobs/:id", handlers.DeleteJob())
		v1.GET("/jobs/:id/activity", handlers.GetJobActivity())
		v1.POST("/jobs/:id/tags", handlers.AssignJobTag())
		v1.DELETE("/jobs/:id/tags/:tagId", handlers.RemoveJobTag())

		// Stages
		v1.GET("/stages", handlers.ListStages())
		v1.POST("/stages", handlers.CreateStage())
		v1.PUT("/stages/reorder", handlers.ReorderStages())
		v1.PUT("/stages/:id", handlers.UpdateStage())
		v1.DELETE("/stages/:id", handlers.DeleteStage())

		// Tags
		v1.GET("/tags", handlers.ListTags())
		v1.POST("/tags", handlers.CreateTag())
		v1.DELETE("/tags/:id", handlers.DeleteTag())

		// Stats
		v1.GET("/stats", handlers.GetStats())

		// Resumes — sync must be registered before :id wildcard routes
		resumes := v1.Group("/resumes")
		{
			resumes.GET("/config", handlers.GetResumeConfig(rxClient, builderPublicURL))
			resumes.GET("", handlers.ListResumes(rxClient))
			resumes.POST("", handlers.CreateResume(rxClient))
			resumes.POST("/sync", handlers.SyncResumes(rxClient))
			resumes.GET("/:id", handlers.GetResume(rxClient))
			resumes.PUT("/:id", handlers.UpdateResume(rxClient))
			resumes.DELETE("/:id", handlers.DeleteResume(rxClient))
			resumes.GET("/:id/pdf", handlers.ExportResumePDF(rxClient))
			resumes.PUT("/:id/base", handlers.SetBaseResume())
		}
	}

	return r
}
