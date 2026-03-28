package router

import (
	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/jobtopbob/jobtopbob/apps/api/internal/handlers"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/middleware"
	"github.com/jobtopbob/jobtopbob/apps/api/internal/services/rxresume"
	"github.com/jobtopbob/jobtopbob/internal/ai"
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
	FrontendURL     string
	AIProvider      ai.Provider
	ScrapersEnabled bool
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
		v1.POST("/jobs", handlers.CreateJob(cfg.RxClient))
		v1.POST("/jobs/import", handlers.ImportJob())
		v1.PATCH("/jobs/bulk", handlers.BulkUpdate())
		v1.GET("/jobs/:id", handlers.GetJob())
		v1.PUT("/jobs/:id", handlers.UpdateJob(cfg.RxClient))
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

		// Companies
		companies := v1.Group("/companies")
		{
			companies.GET("/search", handlers.SearchCompanies())
			companies.GET("", handlers.ListCompanies())
			companies.POST("", handlers.CreateCompany())
			companies.GET("/:id", handlers.GetCompany())
			companies.PUT("/:id", handlers.UpdateCompany())
			companies.DELETE("/:id", handlers.DeleteCompany())
			companies.POST("/:id/logo", handlers.UploadCompanyLogo(cfg.Store))
			companies.DELETE("/:id/logo", handlers.DeleteCompanyLogo(cfg.Store))
			companies.POST("/:id/enrich", handlers.EnrichCompany(cfg.AsynqClient))
			companies.GET("/:id/enrichment-logs", handlers.ListEnrichmentLogs())
		}

		// Contacts
		contacts := v1.Group("/contacts")
		{
			contacts.GET("/search", handlers.SearchContacts())
			contacts.GET("", handlers.ListContacts())
			contacts.POST("", handlers.CreateContact())
			contacts.GET("/:id", handlers.GetContact())
			contacts.PUT("/:id", handlers.UpdateContact())
			contacts.DELETE("/:id", handlers.DeleteContact())
			contacts.POST("/:id/avatar", handlers.UploadContactAvatar(cfg.Store))
			contacts.DELETE("/:id/avatar", handlers.DeleteContactAvatar(cfg.Store))
		}

		// Offers
		offers := v1.Group("/offers")
		{
			offers.GET("", handlers.ListOffers())
			offers.POST("", handlers.CreateOffer())
			offers.GET("/:id", handlers.GetOffer())
			offers.PUT("/:id", handlers.UpdateOffer())
			offers.DELETE("/:id", handlers.DeleteOffer())
		}

		// Resources
		resources := v1.Group("/resources")
		{
			resources.GET("", handlers.ListResources())
			resources.POST("", handlers.CreateResource())
			resources.GET("/:id", handlers.GetResource())
			resources.PUT("/:id", handlers.UpdateResource())
			resources.DELETE("/:id", handlers.DeleteResource())
			resources.POST("/:id/pin", handlers.ToggleResourcePin())
		}

		// Export
		export := v1.Group("/export")
		{
			export.GET("/jobs", handlers.ExportJobs())
			export.GET("/companies", handlers.ExportCompanies())
			export.GET("/contacts", handlers.ExportContacts())
			export.GET("/offers", handlers.ExportOffers())
		}

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
			resumes.GET("/:id/versions", handlers.ListResumeVersions())
			resumes.PUT("/:id/base", handlers.SetBaseResume())
		}

		// Resume versions
		resumeVersions := v1.Group("/resume-versions")
		{
			resumeVersions.GET("/:id", handlers.GetResumeVersion())
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

		// Job Discovery (scrapers)
		if cfg.ScrapersEnabled {
			// Search Profiles
			searchProfiles := v1.Group("/search-profiles")
			{
				searchProfiles.GET("", handlers.ListSearchProfiles())
				searchProfiles.POST("", handlers.CreateSearchProfile())
				searchProfiles.GET("/:id", handlers.GetSearchProfile())
				searchProfiles.PUT("/:id", handlers.UpdateSearchProfile())
				searchProfiles.DELETE("/:id", handlers.DeleteSearchProfile())
				searchProfiles.POST("/:id/run", handlers.RunSearchProfile(cfg.AsynqClient))
			}

			// Discover
			discover := v1.Group("/discover")
			{
				discover.POST("/search", handlers.QuickSearch(cfg.AsynqClient))
				discover.GET("/jobs", handlers.ListDiscoveredJobs())
				discover.POST("/from-resume/:id", handlers.SearchFromExistingResume(cfg.AsynqClient))
			}

			// Scrape Runs
			v1.GET("/scrape-runs", handlers.ListScrapeRuns())
			v1.GET("/scrape-runs/:id", handlers.GetScrapeRun())
		}

		// AI Features
		if cfg.AIProvider != nil {
			v1.POST("/jobs/:id/extract", handlers.ExtractJob(cfg.AsynqClient))
			v1.POST("/jobs/:id/score", handlers.ScoreJob(cfg.AsynqClient))
			v1.POST("/jobs/:id/ats-score", handlers.ATSScore(cfg.AIProvider))
			v1.POST("/jobs/:id/tailor-resume", handlers.TailorResume(cfg.AIProvider))
			v1.POST("/jobs/:id/cover-letter", handlers.GenerateCoverLetter(cfg.AIProvider))
			v1.POST("/jobs/:id/interview-prep", handlers.GenerateInterviewPrep(cfg.AIProvider))
			v1.GET("/jobs/:id/ghostwriter", handlers.ListGhostwriterMessages())
			v1.POST("/jobs/:id/ghostwriter", handlers.SendGhostwriterMessage(cfg.AIProvider))
		}

		// Job assets (always available)
		v1.GET("/jobs/:id/assets", handlers.ListJobAssets())
		v1.DELETE("/jobs/:id/assets/:assetId", handlers.DeleteJobAsset())

		// SSE (Server-Sent Events)
		if cfg.Redis != nil {
			v1.GET("/events", handlers.SSEHandler(cfg.Redis))
		}
	}

	return r
}
