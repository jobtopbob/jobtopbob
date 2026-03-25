package router

import (
	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/jobtopbob/jobtopbob/apps/api/internal/handlers"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/middleware"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
	"github.com/jobtopbob/jobtopbob/internal/email"
	"github.com/jobtopbob/jobtopbob/internal/storage"
)

// Config holds all dependencies needed to configure the router.
type Config struct {
	Pool             *pgxpool.Pool
	JWKSURL          string
	CORSOrigins      []string
	RxClient         *rxresume.Client
	BuilderPublicURL string
	Store            *storage.Client
	// Email integration
	EmailProvider email.Provider
	MasterKey     []byte
	AsynqClient   *asynq.Client
	Redis         *redis.Client
	FrontendURL   string
}

// New creates a configured Gin engine with all routes and middleware.
func New(cfg Config) *gin.Engine {
	r := gin.New()

	// Global middleware
	r.Use(middleware.Logging())
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(gin.Recovery())

	// Public routes
	r.GET("/health", handlers.Health())

	// Public email routes (browser redirect from Google, Pub/Sub webhook)
	if cfg.EmailProvider != nil {
		// OAuth callback uses RLS middleware to get a DB transaction for token storage.
		// It validates the signed state param instead of JWT.
		callbackGroup := r.Group("/api/v1/email/oauth")
		callbackGroup.Use(middleware.RLS(cfg.Pool))
		callbackGroup.GET("/callback", handlers.GmailOAuthCallback(cfg.EmailProvider, cfg.MasterKey, cfg.AsynqClient, cfg.FrontendURL))

		r.POST("/api/v1/email/webhook", handlers.GmailWebhook(cfg.AsynqClient))
	}

	// Authenticated routes
	v1 := r.Group("/api/v1")
	v1.Use(middleware.Auth(cfg.JWKSURL))
	v1.Use(middleware.RLS(cfg.Pool))
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

		// Settings
		settings := v1.Group("/settings")
		{
			settings.GET("", handlers.GetUserSettings())
			settings.PUT("", handlers.UpdateUserSettings())
			settings.POST("/avatar", handlers.UploadAvatar(cfg.Store))
			settings.DELETE("/avatar", handlers.DeleteAvatar(cfg.Store))
			settings.PUT("/rxresume-key", handlers.SetRxResumeKey(cfg.RxClient))
			settings.DELETE("/rxresume-key", handlers.DeleteRxResumeKey())
			settings.GET("/rxresume-key/status", handlers.GetRxResumeKeyStatus())
		}

		// Resumes — sync must be registered before :id wildcard routes
		resumes := v1.Group("/resumes")
		{
			resumes.GET("/config", handlers.GetResumeConfig(cfg.RxClient, cfg.BuilderPublicURL))
			resumes.GET("", handlers.ListResumes(cfg.RxClient))
			resumes.POST("", handlers.CreateResume(cfg.RxClient))
			resumes.POST("/sync", handlers.SyncResumes(cfg.RxClient))
			resumes.GET("/base", handlers.GetBaseResume())
			resumes.GET("/:id", handlers.GetResume(cfg.RxClient))
			resumes.PUT("/:id", handlers.UpdateResume(cfg.RxClient))
			resumes.DELETE("/:id", handlers.DeleteResume(cfg.RxClient))
			resumes.GET("/:id/pdf", handlers.ExportResumePDF(cfg.RxClient))
			resumes.PUT("/:id/base", handlers.SetBaseResume())
		}

		// Email Integration
		if cfg.EmailProvider != nil {
			emailGroup := v1.Group("/email")
			{
				emailGroup.GET("/oauth/connect", handlers.GmailOAuthConnect(cfg.EmailProvider, cfg.MasterKey))
				emailGroup.GET("/status", handlers.GmailStatus(cfg.EmailProvider))
				emailGroup.DELETE("/disconnect", handlers.GmailDisconnect(cfg.EmailProvider, cfg.MasterKey))
				emailGroup.GET("/events", handlers.ListEmailEvents())
				emailGroup.GET("/events/unconfirmed", handlers.ListUnconfirmedEmailEvents())
				emailGroup.GET("/events/unconfirmed/count", handlers.CountUnconfirmedEmailEvents())
				emailGroup.POST("/events/:id/confirm", handlers.ConfirmEmailEvent())
				emailGroup.POST("/events/:id/dismiss", handlers.DismissEmailEvent())
				emailGroup.PUT("/events/:id/job", handlers.LinkEmailEventToJob())
			}
		}

		// SSE (Server-Sent Events)
		if cfg.Redis != nil {
			v1.GET("/events", handlers.SSEHandler(cfg.Redis))
		}
	}

	return r
}
