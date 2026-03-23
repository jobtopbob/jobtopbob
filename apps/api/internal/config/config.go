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
	ResumeBuilderURL   string
	RxResumeAPIKey     string
	RxResumeDBURL      string // read-only connection to rxresume database
	RxResumeAuthSecret string // shared JWT signing secret (unused for now, reserved)

	// S3-compatible storage (RustFS in dev, any S3 provider in prod)
	S3Bucket    string
	S3Region    string
	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string
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
		ResumeBuilderURL:    getEnv("RESUME_BUILDER_URL", "http://localhost:3010"),
		RxResumeAPIKey:      getEnv("RXRESUME_API_KEY", ""),
		RxResumeDBURL:       getEnv("RXRESUME_DATABASE_URL", "postgres://rxresume_reader:changeme@localhost:5432/rxresume?sslmode=disable"),
		RxResumeAuthSecret:  getEnv("RXRESUME_AUTH_SECRET", ""),
		S3Bucket:             getEnv("S3_BUCKET", "jobtopbob"),
		S3Region:             getEnv("S3_REGION", "us-east-1"),
		S3Endpoint:           getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKey:          getEnv("S3_ACCESS_KEY", "rustfsadmin"),
		S3SecretKey:          getEnv("S3_SECRET_KEY", "rustfsadmin"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
