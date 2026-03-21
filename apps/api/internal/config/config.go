package config

import (
	"os"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	RedisURL    string
	JWKSURL     string
	CORSOrigins []string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://jobtopbob:changeme@localhost:5432/jobtopbob?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://:changeme@localhost:6379/0"),
		JWKSURL:     getEnv("JWKS_URL", "http://localhost:3000/api/auth/jwks"),
		CORSOrigins: strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
