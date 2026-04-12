package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort         string
	DatabaseURL     string
	RedisAddr       string
	JWTSecret       string
	JWTTTLMinutes   int
	Environment     string
	ScanWindowSec   int
	CookieSecure    bool
	CORSAllowedHost string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	cfg := Config{
		AppPort:         getEnv("APP_PORT", "8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		RedisAddr:       getEnv("REDIS_ADDR", "localhost:6379"),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-prod"),
		JWTTTLMinutes:   getEnvInt("JWT_TTL_MINUTES", 480),
		Environment:     getEnv("APP_ENV", "development"),
		ScanWindowSec:   getEnvInt("SCAN_WINDOW_SEC", 5),
		CookieSecure:    getEnvBool("COOKIE_SECURE", false),
		CORSAllowedHost: getEnv("CORS_ALLOWED_HOST", "http://localhost:5173"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
