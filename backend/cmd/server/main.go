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
	"erplite/backend/internal/events"
	"erplite/backend/internal/repository"
	"erplite/backend/internal/agent/warehouse"
	"erplite/backend/internal/agent/material"
	"erplite/backend/internal/agent/barcode"
	"erplite/backend/internal/agent/inventory"
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

	hub := events.NewHub()
	go hub.Run()

	wsHandler := handlers.NewWebSocketHandler(hub)

	// Phase 2: StockFlow Core
	uow := repository.NewUnitOfWork(pool)
	
	barcodeAgent := barcode.New(hub)
	
	warehouseAgent := warehouse.New(hub)
	operationHandler := handlers.NewOperationHandler(uow, warehouseAgent, barcodeAgent, pool)
	statsHandler := handlers.NewStatsHandler(pool)
	tenantHandler := handlers.NewTenantHandler(pool, hub)
	orgHandler := handlers.NewOrgHandler(pool)
	
	productAgent := material.New(hub)
	productHandler := handlers.NewProductHandler(uow, productAgent, pool)
	barcodeHandler := handlers.NewBarcodeHandler(uow, pool)

	inventoryAgent := inventory.New(hub)
	grWorkflow := &inventory.GRWorkflow{
		Hub:            hub,
		InventoryAgent: inventoryAgent,
		BarcodeAgent:   barcodeAgent,
		WarehouseAgent: warehouseAgent,
	}
	grHandler := handlers.NewGRHandler(uow, grWorkflow, warehouseAgent)

	routerDeps := api.RouterDeps{
		JWTSecret:        cfg.JWTSecret,
		AllowedHost:      cfg.CORSAllowedHost,
		AuthHandler:      authHandler,
		WSHandler:        wsHandler,
		OperationHandler: operationHandler,
		StatsHandler:     statsHandler,
		TenantHandler:    tenantHandler,
		OrgHandler:       orgHandler,
		ProductHandler:   productHandler,
		BarcodeHandler:   barcodeHandler,
		GRHandler:        grHandler,
	}

	r := api.NewRouter(routerDeps)

	slog.Info("Server starting", "port", cfg.AppPort)
	if err := http.ListenAndServe(":"+cfg.AppPort, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
