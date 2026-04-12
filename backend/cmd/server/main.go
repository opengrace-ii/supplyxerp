package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"

	"erplite/backend/internal/api"
	"erplite/backend/internal/api/handlers"
	"erplite/backend/internal/config"
	"erplite/backend/internal/db"
	"erplite/backend/internal/db/dbgen"
	"erplite/backend/internal/service"
)

func main() {
	ctx := context.Background()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	redisClient := db.NewRedisClient(cfg.RedisAddr)
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("connect redis: %v", err)
	}
	defer redisClient.Close()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()

	// Ensure DB migrations
	if err := db.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	queries := dbgen.New(pool)
	authService := service.NewAuthService(queries)
	authHandler := handlers.NewAuthHandler(authService, cfg.JWTSecret, cfg.JWTTTLMinutes, cfg.CookieSecure)

	routerDeps := api.RouterDeps{
		JWTSecret:   cfg.JWTSecret,
		AllowedHost: cfg.CORSAllowedHost,
		AuthHandler: authHandler,
	}

	r := api.NewRouter(routerDeps)

	slog.Info("Server starting", "port", cfg.AppPort)
	if err := http.ListenAndServe(":"+cfg.AppPort, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
