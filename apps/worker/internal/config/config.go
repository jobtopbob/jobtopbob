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
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	return &Config{
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://jobtopbob_app:changeme@localhost:5432/jobtopbob?sslmode=disable"),
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
		AIAPIKey:             getEnv("AI_API_KEY", getEnv("OPENAI_API_KEY", getEnv("OPENROUTER_API_KEY", ""))),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
