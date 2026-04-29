package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"

	"supplyxerp/backend/internal/api"
	"supplyxerp/backend/internal/api/handlers"
	"supplyxerp/backend/internal/config"
	"supplyxerp/backend/internal/db"
	"supplyxerp/backend/internal/db/dbgen"
	"supplyxerp/backend/internal/events"
	"supplyxerp/backend/internal/repository"
	"supplyxerp/backend/internal/agent/warehouse"
	"supplyxerp/backend/internal/agent/material"
	"supplyxerp/backend/internal/agent/barcode"
	"supplyxerp/backend/internal/agent/inventory"
	"supplyxerp/backend/internal/agent/purchasing"
	"supplyxerp/backend/internal/agent/pricing"
	"supplyxerp/backend/internal/service"
	syslogger "supplyxerp/backend/internal/logger"
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

	syslogger.Init(pool)

	// Ensure DB migrations
	if err := db.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	queries := dbgen.New(pool)
	authService := service.NewAuthService(queries)
	authHandler := handlers.NewAuthHandler(authService, cfg.JWTSecret, cfg.JWTTTLMinutes, cfg.CookieSecure)

	hub := events.NewHub(pool)
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
	orgMasterHandler := handlers.NewOrgMasterHandler(pool)
	
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
	
	giWorkflow := &inventory.GIWorkflow{
		Hub:            hub,
		InventoryAgent: inventoryAgent,
	}
	giHandler := handlers.NewGIHandler(uow, giWorkflow)
	reservationHandler := handlers.NewReservationHandler(uow)

	configHandler := handlers.NewConfigHandler(uow, pool)
	migrationHandler := handlers.NewMigrationHandler(uow, pool)
	stockHandler := handlers.NewStockHandler(uow, inventoryAgent)
	
	purchasingAgent := purchasing.New(hub)
	pricingAgent := pricing.New(hub)
	rfqHandler := handlers.NewRFQHandler(uow, purchasingAgent, pricingAgent, pool)
	supplierHandler := handlers.NewSupplierHandler(uow)
	purchasingHandler := handlers.NewPurchasingHandler(uow, purchasingAgent, pool)
	
	productionWorkflow := &inventory.ProductionWorkflow{
		Hub:            hub,
		InventoryAgent: inventoryAgent,
		BarcodeAgent:   barcodeAgent,
		WarehouseAgent: warehouseAgent,
	}
	productionHandler := handlers.NewProductionHandler(uow, productionWorkflow, pool)
	poEnrichHandler := handlers.NewPOEnrichHandler(pool)
	systemHandler := handlers.NewSystemHandler(pool)
	progressHandler := handlers.NewProgressHandler(pool)
	supplyPactsHandler := handlers.NewSupplyPactsHandler(pool)
	deliveryHandler := handlers.NewDeliveryHandler(pool)
	usersHandler := handlers.NewUsersHandler(pool)
	buildOrderHandler := handlers.NewBuildOrderHandler(queries)
	qualityHandler := handlers.NewQualityHandler(pool, uow)
	dealFlowHandler := handlers.NewDealFlowHandler(queries)
	routeRunnerHandler := handlers.NewRouteRunnerHandler(queries)
	vendorScorecardHandler := handlers.NewVendorScorecardHandler(queries)
	stockTransferHandler := handlers.NewStockTransferHandler(uow, inventoryAgent, pool)
	rollsHandler := handlers.NewRollsHandler(uow)

	routerDeps := api.RouterDeps{
		JWTSecret:        cfg.JWTSecret,
		AllowedHost:      cfg.CORSAllowedHost,
		AuthHandler:      authHandler,
		WSHandler:        wsHandler,
		OperationHandler: operationHandler,
		StatsHandler:     statsHandler,
		TenantHandler:    tenantHandler,
		OrgHandler:       orgHandler,
		OrgMasterHandler: orgMasterHandler,
		ProductHandler:   productHandler,
		BarcodeHandler:   barcodeHandler,
		GRHandler:        grHandler,
		GIHandler:        giHandler,
		ReservationHandler: reservationHandler,
		ConfigHandler:    configHandler,
		MigrationHandler: migrationHandler,
		StockHandler:     stockHandler,
		ProductionHandler: productionHandler,
		SupplierHandler:  supplierHandler,
		PurchasingHandler: purchasingHandler,
		RFQHandler:       rfqHandler,
		POEnrichHandler:  poEnrichHandler,
		ProgressHandler:  progressHandler,
		SystemHandler:    systemHandler,
		SupplyPactsHandler: supplyPactsHandler,
		DeliveryHandler:  deliveryHandler,
		UsersHandler:     usersHandler,
		BuildOrderHandler:     buildOrderHandler,
		QualityHandler:   qualityHandler,
		DealFlowHandler:  dealFlowHandler,
		RouteRunnerHandler: routeRunnerHandler,
		VendorScorecardHandler: vendorScorecardHandler,
		DispatchHandler:  handlers.NewDispatchHandler(queries),
		StockTransferHandler: stockTransferHandler,
		RollsHandler:         rollsHandler,
	}

	r := api.NewRouter(routerDeps)

	slog.Info("Server starting", "port", cfg.AppPort)
	if err := http.ListenAndServe(":"+cfg.AppPort, r); err != nil {
		log.Fatalf("server: %v", err)
	}
}
