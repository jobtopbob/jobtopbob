package config

import (
	"os"
	"strings"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	MigrationDatabaseURL string
	RedisURL             string
	JWKSURL              string
	CORSOrigins          []string
	SeedDemoData         bool

	// Resume Builder (Reactive Resume v5)
	ResumeBuilderURL        string
	ResumePrinterHTTPURL    string // Browserless Chromium HTTP endpoint for direct PDF generation
	ResumeBuilderPrinterURL string // URL the printer uses to reach the resume builder (Docker-internal)
	ResumeBuilderPublicURL  string // Public URL for users to access the resume builder in their browser

	// S3-compatible storage (RustFS in dev, any S3 provider in prod)
	S3Bucket    string
	S3Region    string
	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string

	// Encryption
	EncryptionKey string

	// Gmail OAuth
	GoogleClientID       string
	GoogleClientSecret   string
	GoogleRedirectURI    string
	GoogleCloudProjectID string
	PubSubTopicName      string
}

func Load() *Config {
	dbURL := getEnv("DATABASE_URL", "postgres://jobtopbob_app:changeme@localhost:5432/jobtopbob?sslmode=disable")
	migrationURL := getEnv("MIGRATION_DATABASE_URL", "postgres://postgres:changeme@localhost:5432/jobtopbob?sslmode=disable")

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		DatabaseURL:          dbURL,
		MigrationDatabaseURL: migrationURL,
		RedisURL:             getEnv("REDIS_URL", "redis://:changeme@localhost:6379/0"),
		JWKSURL:              getEnv("JWKS_URL", "http://localhost:3000/api/auth/jwks"),
		CORSOrigins:          strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		SeedDemoData:         getEnv("SEED_DEMO_DATA", "false") == "true",
		ResumeBuilderURL:      getEnv("RESUME_BUILDER_URL", "http://localhost:3010"),
		ResumePrinterHTTPURL: getEnv("RESUME_PRINTER_HTTP_URL", "http://localhost:3020"),
		ResumeBuilderPrinterURL: getEnv("RESUME_BUILDER_PRINTER_URL", "http://resume-builder:3000"),
		ResumeBuilderPublicURL:  getEnv("RESUME_BUILDER_PUBLIC_URL", "http://localhost:3010"),
		S3Bucket:             getEnv("S3_BUCKET", "jobtopbob"),
		S3Region:             getEnv("S3_REGION", "us-east-1"),
		S3Endpoint:           getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKey:          getEnv("S3_ACCESS_KEY", "rustfsadmin"),
		S3SecretKey:          getEnv("S3_SECRET_KEY", "rustfsadmin"),

		EncryptionKey:        getEnv("API_ENCRYPTION_KEY", ""),
		GoogleClientID:       getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:   getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURI:    getEnv("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/v1/email/oauth/callback"),
		GoogleCloudProjectID: getEnv("GOOGLE_CLOUD_PROJECT_ID", ""),
		PubSubTopicName:      getEnv("PUBSUB_TOPIC_NAME", "gmail-watch"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
