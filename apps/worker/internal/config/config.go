package config

import "os"

// Config holds worker configuration loaded from environment variables.
type Config struct {
	DatabaseURL string
	RedisURL    string

	// Encryption
	EncryptionKey string

	// Gmail OAuth
	GoogleClientID       string
	GoogleClientSecret   string
	GoogleRedirectURI    string
	GoogleCloudProjectID string
	PubSubTopicName      string

	// AI Provider
	AIProvider string
	AIModel    string
	AIBaseURL  string
	AIAPIKey   string

	// Company Enrichment
	PDLAPIKey string

	// S3-compatible Storage (RustFS)
	S3Bucket    string
	S3Region    string
	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string

	// Scrapers
	ScrapersEnabled bool
	ScraperSerpURL  string
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		DatabaseURL:          getEnv("WORKER_DATABASE_URL", getEnv("DATABASE_URL", "postgres://jobtopbob_worker:changeme@localhost:5432/jobtopbob?sslmode=disable")),
		RedisURL:             getEnv("REDIS_URL", "redis://:changeme@localhost:6379/0"),
		EncryptionKey:        getEnv("API_ENCRYPTION_KEY", ""),
		GoogleClientID:       getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:   getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:    getEnv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/v1/email/oauth/callback"),
		GoogleCloudProjectID: getEnv("GOOGLE_CLOUD_PROJECT_ID", ""),
		PubSubTopicName:      getEnv("PUBSUB_TOPIC_NAME", "gmail-watch"),
		AIProvider:           getEnv("AI_PROVIDER", "openai"),
		AIModel:              getEnv("AI_MODEL", "gpt-4o-mini"),
		AIBaseURL:            getEnv("AI_BASE_URL", ""),
		AIAPIKey:             resolveAIKey(getEnv("AI_PROVIDER", "openai")),
		PDLAPIKey:            getEnv("PDL_API_KEY", ""),
		S3Bucket:             getEnv("S3_BUCKET", "jobtopbob"),
		S3Region:             getEnv("S3_REGION", "us-east-1"),
		S3Endpoint:           getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKey:          getEnv("S3_ACCESS_KEY", "rustfsadmin"),
		S3SecretKey:          getEnv("S3_SECRET_KEY", "rustfsadmin"),
		ScrapersEnabled: getEnv("SCRAPERS_ENABLED", "false") == "true",
		ScraperSerpURL:  getEnv("SCRAPER_SERP_URL", "http://localhost:3031"),
	}
}

func resolveAIKey(provider string) string {
	switch provider {
	case "openai":
		return getEnv("OPENAI_API_KEY", "")
	case "anthropic":
		return getEnv("ANTHROPIC_API_KEY", "")
	case "gemini":
		return getEnv("GOOGLE_API_KEY", "")
	case "openrouter":
		return getEnv("OPENROUTER_API_KEY", "")
	default:
		return ""
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
