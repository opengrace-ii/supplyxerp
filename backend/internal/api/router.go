package api

import (
	"net/http"

	"supplyxerp/backend/internal/api/handlers"
	"supplyxerp/backend/internal/api/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"supplyxerp/backend/internal/logger"
)

type RouterDeps struct {
	JWTSecret        string
	AllowedHost      string
	AuthHandler      *handlers.AuthHandler
	WSHandler        *handlers.WebSocketHandler
	OperationHandler *handlers.OperationHandler
	StatsHandler     *handlers.StatsHandler
	TenantHandler    *handlers.TenantHandler
	OrgHandler       *handlers.OrgHandler
	OrgMasterHandler *handlers.OrgMasterHandler
	ProductHandler   *handlers.ProductHandler
	BarcodeHandler   *handlers.BarcodeHandler
	GRHandler        *handlers.GRHandler
	ConfigHandler    *handlers.ConfigHandler
	MigrationHandler *handlers.MigrationHandler
	StockHandler     *handlers.StockHandler
	ProductionHandler *handlers.ProductionHandler
	SupplierHandler  *handlers.SupplierHandler
	PurchasingHandler *handlers.PurchasingHandler
	RFQHandler       *handlers.RFQHandler
	POEnrichHandler  *handlers.POEnrichHandler
	ProgressHandler  *handlers.ProgressHandler
	SystemHandler    *handlers.SystemHandler
	SupplyPactsHandler *handlers.SupplyPactsHandler
	DeliveryHandler  *handlers.DeliveryHandler
	UsersHandler     *handlers.UsersHandler
	BuildOrderHandler *handlers.BuildOrderHandler
	QualityHandler   *handlers.QualityHandler
	DealFlowHandler  *handlers.DealFlowHandler
	RouteRunnerHandler *handlers.RouteRunnerHandler
}

func NewRouter(deps RouterDeps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.StructuredLogger())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{deps.AllowedHost},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.Use(logger.Middleware(logger.Global))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/ws", deps.WSHandler.Handle)

	auth := r.Group("/api/auth")
	{
		auth.POST("/login", deps.AuthHandler.Login)
		auth.POST("/refresh", deps.AuthHandler.Refresh)
	}

	secured := r.Group("/")
	secured.Use(middleware.AuthRequired(deps.JWTSecret))
	{
		secured.POST("/api/auth/logout", deps.AuthHandler.Logout)
		secured.GET("/api/auth/me", deps.AuthHandler.Me)

		// Stats
		secured.GET("/api/stats/stockflow", deps.StatsHandler.GetStockFlowStats)

		// Tenants
		secured.GET("/api/tenants", deps.TenantHandler.ListTenants)
		secured.POST("/api/tenants", deps.TenantHandler.CreateTenant)

		// Org Structure
		secured.GET("/api/organisations", deps.OrgHandler.ListOrganisations)
		secured.POST("/api/organisations", deps.OrgHandler.CreateOrganisation)
		secured.GET("/api/organisations/:id/sites", deps.OrgHandler.ListSites)
		secured.POST("/api/organisations/:id/sites", deps.OrgHandler.CreateSite)
		secured.GET("/api/sites/:id/zones", deps.OrgHandler.ListZones)
		secured.POST("/api/sites/:id/zones", deps.OrgHandler.CreateZone)
		secured.GET("/api/org-tree", deps.OrgHandler.GetOrgTree)
		secured.POST("/api/organisations/:id/provision-defaults", deps.OrgHandler.ProvisionDefaults)

		// Org Master (Session D — Organisational Master)
		org := secured.Group("/api/org")
		{
			org.GET("/summary",                              deps.OrgMasterHandler.GetOrgSummary)
			org.GET("/companies",                            deps.OrgMasterHandler.ListCompanies)
			org.POST("/companies",                           deps.OrgMasterHandler.CreateCompany)
			org.PATCH("/companies/:id",                      deps.OrgMasterHandler.UpdateCompany)
			org.GET("/sites",                                deps.OrgMasterHandler.ListSites)
			org.POST("/sites",                               deps.OrgMasterHandler.CreateSite)
			org.PATCH("/sites/:id",                          deps.OrgMasterHandler.UpdateSite)
			org.GET("/sites/:id/zones",                      deps.OrgMasterHandler.ListSiteZones)
			org.GET("/sites/:id/areas",                      deps.OrgMasterHandler.ListStorageAreas)
			org.POST("/sites/:id/areas",                     deps.OrgMasterHandler.CreateStorageArea)
			org.PATCH("/areas/:id",                          deps.OrgMasterHandler.UpdateStorageArea)
			org.POST("/sites/:id/zones",                     deps.OrgMasterHandler.CreateZoneForSite)
			org.PATCH("/zones/:id",                          deps.OrgMasterHandler.UpdateZone)
			org.GET("/calendars",                            deps.OrgMasterHandler.ListCalendars)
			org.POST("/calendars",                           deps.OrgMasterHandler.CreateCalendar)
			org.PATCH("/calendars/:id",                      deps.OrgMasterHandler.UpdateCalendar)
			org.POST("/calendars/:id/exceptions",            deps.OrgMasterHandler.AddCalendarException)
			org.DELETE("/calendars/:id/exceptions/:date",    deps.OrgMasterHandler.DeleteCalendarException)
			org.GET("/calendars/:id/working-days",           deps.OrgMasterHandler.GetWorkingDays)
			org.GET("/procurement-units",                    deps.OrgMasterHandler.ListProcurementUnits)
			org.POST("/procurement-units",                   deps.OrgMasterHandler.CreateProcurementUnit)
			org.PATCH("/procurement-units/:id",              deps.OrgMasterHandler.UpdateProcurementUnit)
			org.POST("/procurement-units/:id/sites",         deps.OrgMasterHandler.AssignSitesToProcurementUnit)
			org.DELETE("/procurement-units/:id/sites/:sid",  deps.OrgMasterHandler.RemoveSiteFromProcurementUnit)
			org.GET("/procurement-teams",                    deps.OrgMasterHandler.ListProcurementTeams)
			org.POST("/procurement-teams",                   deps.OrgMasterHandler.CreateProcurementTeam)
			org.PATCH("/procurement-teams/:id",              deps.OrgMasterHandler.UpdateProcurementTeam)
		}

		// Tenant Profile
		secured.GET("/api/config/tenant-profile",   deps.OrgMasterHandler.GetTenantProfile)
		secured.PATCH("/api/config/tenant-profile", deps.OrgMasterHandler.UpdateTenantProfile)

		// MaterialHub (MM)
		secured.GET("/api/products", deps.ProductHandler.ListProducts)
		secured.POST("/api/products", deps.ProductHandler.CreateProduct)
		secured.PUT("/api/products/:public_id", deps.ProductHandler.UpdateProduct)
		secured.PUT("/api/products/:public_id/uom", deps.ProductHandler.UpdateUOM)
		secured.GET("/api/products/:public_id/stock", deps.ProductHandler.GetStock)

		// Barcodes
		secured.POST("/api/barcodes", deps.BarcodeHandler.Register)
		secured.DELETE("/api/barcodes/:code", deps.BarcodeHandler.Deactivate)

		// StockFlow Operations
		secured.POST("/api/scan", deps.OperationHandler.Scan)
		secured.POST("/api/move", deps.OperationHandler.Move)

		// Goods Receipt & Warehouse Tasks
		secured.POST("/api/gr", deps.GRHandler.PostGR)
		secured.GET("/api/gr", deps.GRHandler.ListGRs)
		secured.GET("/api/gr/:id", deps.GRHandler.GetGR)
		secured.GET("/api/gr/stats", deps.GRHandler.GetStats)
		secured.GET("/api/warehouse-tasks", deps.GRHandler.ListPutawayTasks)
		secured.POST("/api/warehouse-tasks/:id/complete", deps.GRHandler.CompletePutaway)

		// Tenant Config
		secured.GET("/api/config/tenant", deps.ConfigHandler.GetTenantConfig)
		secured.PUT("/api/config/tenant", deps.ConfigHandler.UpdateTenantConfig)
		secured.GET("/api/config/domain-profiles", deps.ConfigHandler.ListProfiles)
		secured.POST("/api/config/domain-profiles/apply", deps.ConfigHandler.ApplyProfile)
		secured.POST("/api/config/sequences/apply", deps.ConfigHandler.ApplySequence)

		// Data Migration
		secured.GET("/api/migration/status", deps.MigrationHandler.GetStatus)
		secured.GET("/api/migration/template/products", deps.MigrationHandler.DownloadProductTemplate)
		secured.GET("/api/migration/template/opening-balances", deps.MigrationHandler.DownloadOBTemplate)
		secured.POST("/api/migration/products", deps.MigrationHandler.ImportProducts)
		secured.POST("/api/migration/opening-balances", deps.MigrationHandler.ImportOpeningBalances)
		secured.PUT("/api/migration/go-live-date", deps.MigrationHandler.UpdateGoLiveDate)
		secured.POST("/api/admin/reset", deps.MigrationHandler.ResetTenant)

		// LedgerStock (Intelligence)
		secured.GET("/api/stock/overview", deps.StockHandler.GetOverview)
		secured.GET("/api/stock/products", deps.StockHandler.ListProducts)
		secured.GET("/api/stock/products/:id", deps.StockHandler.GetProductDetail)
		secured.GET("/api/stock/zones", deps.StockHandler.ListZones)
		secured.GET("/api/stock/hu/:hu_code", deps.StockHandler.GetHUDetail)
		secured.GET("/api/stock/movements", deps.StockHandler.ListMovements)
		secured.GET("/api/stock/alerts", deps.StockHandler.GetAlerts)
		secured.POST("/api/stock/adjust", deps.StockHandler.AdjustStock)
		secured.GET("/api/stock/adjustments", deps.StockHandler.ListAdjustments)

		// Production Operations
		secured.POST("/api/stock/move", deps.ProductionHandler.Move)
		secured.POST("/api/stock/split", deps.ProductionHandler.Split)
		secured.POST("/api/stock/consume", deps.ProductionHandler.Consume)
		secured.GET("/api/stock/hu/:hu_code/lineage", deps.ProductionHandler.GetLineage)

		// Phase 3: MaterialHub Purchasing
		secured.GET("/api/suppliers", deps.SupplierHandler.List)
		secured.POST("/api/suppliers", deps.SupplierHandler.Create)
		secured.PUT("/api/suppliers/:id", deps.SupplierHandler.Update)
		secured.DELETE("/api/suppliers/:id", deps.SupplierHandler.Delete)

		secured.GET("/api/purchase-requests", deps.PurchasingHandler.ListPRs)
		secured.POST("/api/purchase-requests", deps.PurchasingHandler.CreatePR)
		secured.GET("/api/purchase-requests/:id", deps.PurchasingHandler.GetPR)
		secured.POST("/api/purchase-requests/:id/submit", deps.PurchasingHandler.SubmitPR)
		secured.POST("/api/purchase-requests/:id/approve", middleware.RequireRole("ADMIN", "WAREHOUSE_MANAGER"), deps.PurchasingHandler.ApprovePR)
		secured.POST("/api/purchase-requests/:id/reject", middleware.RequireRole("ADMIN", "WAREHOUSE_MANAGER"), deps.PurchasingHandler.RejectPR)
		secured.POST("/api/purchase-requests/:id/convert", middleware.RequireRole("ADMIN", "WAREHOUSE_MANAGER"), deps.PurchasingHandler.ConvertToPO)

		// Pricing & Info Records
		secured.POST("/api/config/pricing/seed", deps.ConfigHandler.SeedPricingDefaults)
		secured.GET("/api/config/pricing", deps.ConfigHandler.GetPricingConfig)
		secured.PATCH("/api/config/pricing", deps.ConfigHandler.UpdatePricingConfig)
		
		secured.GET("/api/products/:public_id/pricing", deps.ProductHandler.GetProductPricing)
		secured.PATCH("/api/products/:public_id/pricing", deps.ProductHandler.UpdateProductPricing)

		secured.GET("/api/suppliers/:public_id/info-records", deps.PurchasingHandler.ListSupplierInfoRecords)
		secured.POST("/api/suppliers/:public_id/info-records", deps.PurchasingHandler.CreateInfoRecord)
		secured.GET("/api/info-records", deps.PurchasingHandler.ListAllInfoRecords)
		secured.PATCH("/api/info-records/:id/deactivate", deps.PurchasingHandler.DeactivateInfoRecord)

		// Config - RFQ
		secured.GET("/api/config/rfq-types", deps.ConfigHandler.GetRFQTypes)
		secured.POST("/api/config/rfq-types", deps.ConfigHandler.CreateRFQType)
		secured.GET("/api/config/rfq-order-reasons", deps.ConfigHandler.GetOrderReasons)
		secured.POST("/api/config/rfq-order-reasons", deps.ConfigHandler.CreateOrderReason)

		secured.GET("/api/purchase-orders", deps.PurchasingHandler.ListPOs)
		secured.POST("/api/purchase-orders", deps.PurchasingHandler.CreatePO)
		secured.GET("/api/purchase-orders/:id", deps.PurchasingHandler.GetPO)
		secured.GET("/api/purchase-orders/:id/items", deps.PurchasingHandler.ListPOItems)
		secured.POST("/api/purchase-orders/:id/items", deps.PurchasingHandler.AddPOItem)
		secured.POST("/api/purchase-orders/:id/submit", deps.PurchasingHandler.SubmitPO)
		secured.POST("/api/purchase-orders/:id/approve", middleware.RequireRole("ADMIN", "WAREHOUSE_MANAGER"), deps.PurchasingHandler.ApprovePO)
		secured.POST("/api/purchase-orders/:id/reject", middleware.RequireRole("ADMIN", "WAREHOUSE_MANAGER"), deps.PurchasingHandler.RejectPO)

		// Phase 3: PO Progress Tracking (SAP 10.5)
		if deps.ProgressHandler != nil {
			secured.GET("/api/po/scenarios", deps.ProgressHandler.GetScenarios)
			secured.GET("/api/po/progress/dashboard", deps.ProgressHandler.GetProgressDashboard)
			secured.GET("/api/po/:id/progress", deps.ProgressHandler.GetPOProgress)
			secured.POST("/api/po/:id/progress/initialize", deps.ProgressHandler.InitializeProgress)
			secured.PUT("/api/po/:id/progress/:event_code", deps.ProgressHandler.UpdateProgressEvent)
		}

		// Phase 3: Session C - RFQ Complete
		rfq := secured.Group("/api/rfq")
		{
			rfq.POST("", deps.RFQHandler.CreateRFQ)
			rfq.GET("", deps.RFQHandler.ListRFQs)
			rfq.GET("/:id", deps.RFQHandler.GetRFQ)
			rfq.PATCH("/:id", deps.RFQHandler.UpdateRFQHeader)
			rfq.PATCH("/:id/cancel", deps.RFQHandler.CancelRFQ)
			rfq.PATCH("/:id/lines/:line_id", deps.RFQHandler.UpdateRFQLine)
			rfq.POST("/:id/lines/:line_id/schedule", deps.RFQHandler.SetDeliverySchedule)
			rfq.POST("/:id/vendors", deps.RFQHandler.InviteVendors)
			rfq.GET("/:id/vendors", deps.RFQHandler.GetRFQVendors)
			rfq.DELETE("/:id/vendors/:vendor_id", deps.RFQHandler.UninviteVendor)
			rfq.POST("/:id/quotations", deps.RFQHandler.EnterQuotation)
			rfq.GET("/:id/quotations", deps.RFQHandler.GetQuotations)
			rfq.PATCH("/:id/quotations/:qid", deps.RFQHandler.UpdateQuotation)
			rfq.POST("/:id/quotations/:qid/reject-line", deps.RFQHandler.RejectQuotationLine)
			rfq.GET("/:id/compare", deps.RFQHandler.CompareQuotations)
			rfq.POST("/:id/finalise", deps.RFQHandler.FinaliseRFQ)
			rfq.POST("/:id/rejection-notices", deps.RFQHandler.MarkRejectionNoticesSent)
		}

		// Phase 1: PO Document Completeness (enrich tabs)
		if deps.POEnrichHandler != nil {
			deps.POEnrichHandler.RegisterPOEnrichRoutes(secured.Group("/api"))
		}

		// System Logs
		{
			secured.GET("/api/system/logs",         deps.SystemHandler.GetLogs)
			secured.GET("/api/system/logs/summary", deps.SystemHandler.GetLogsSummary)
		}

		// Phase 4: Supply Pacts
		pacts := secured.Group("/api/supply-pacts")
		{
			pacts.GET("", deps.SupplyPactsHandler.ListSupplyPacts)
			pacts.POST("", deps.SupplyPactsHandler.CreateSupplyPact)
			pacts.GET("/:id", deps.SupplyPactsHandler.GetSupplyPact)
			pacts.PUT("/:id/activate", deps.SupplyPactsHandler.ActivateSupplyPact)
			pacts.PUT("/:id/lines", deps.SupplyPactsHandler.UpdateSupplyPactLines)
			pacts.POST("/:id/releases", deps.SupplyPactsHandler.CreatePactRelease)
			pacts.GET("/:id/releases", deps.SupplyPactsHandler.ListPactReleases)
		}

		// Phase 4: Vendor Scorecards
		vsc := secured.Group("/api/vendors")
		{
			vsc.GET("/:id/scorecard", deps.SupplyPactsHandler.GetVendorScorecards)
			vsc.POST("/:id/scorecard", deps.SupplyPactsHandler.CreateVendorScorecard)
			vsc.GET("/scorecard-summary", deps.SupplyPactsHandler.GetScorecardSummary)
		}

		// Phase 4: Price Formulas
		price := secured.Group("/api/price-formulas")
		{
			price.GET("", deps.SupplyPactsHandler.ListPriceFormulas)
			price.GET("/:id", deps.SupplyPactsHandler.GetPriceFormula)
			price.PUT("/:id/rules", deps.SupplyPactsHandler.UpdatePriceFormulaRules)
			price.POST("/:id/rules/:rule_id/records", deps.SupplyPactsHandler.CreatePriceRuleRecord)
			price.POST("/calculate", deps.SupplyPactsHandler.CalculatePrice)
		}

		// Phase 4: Document Dispatch
		disp := secured.Group("/api/dispatch")
		{
			disp.GET("/rules", deps.SupplyPactsHandler.GetDispatchRules)
			disp.PUT("/rules", deps.SupplyPactsHandler.UpdateDispatchRules)
			disp.POST("/send", deps.SupplyPactsHandler.SendDocument)
			disp.GET("/log", deps.SupplyPactsHandler.GetDispatchLog)
		}

		// Delivery Confirmations
		if deps.DeliveryHandler != nil {
			secured.GET ("/api/delivery-confirmations",        deps.DeliveryHandler.ListDCs)
			secured.POST("/api/delivery-confirmations",        deps.DeliveryHandler.CreateDC)
			secured.GET ("/api/delivery-confirmations/:id",    deps.DeliveryHandler.GetDC)
			secured.PUT ("/api/delivery-confirmations/:id/lines", deps.DeliveryHandler.UpsertDCLines)
			secured.POST("/api/delivery-confirmations/:id/post",  deps.DeliveryHandler.PostDC)
			secured.POST("/api/delivery-confirmations/:id/reverse", deps.DeliveryHandler.ReverseDC)

			// Supplier Invoices
			secured.GET ("/api/supplier-invoices",             deps.DeliveryHandler.ListInvoices)
			secured.POST("/api/supplier-invoices",             deps.DeliveryHandler.CreateInvoice)
			secured.PUT ("/api/supplier-invoices/:id/lines",   deps.DeliveryHandler.UpsertInvoiceLines)
			secured.POST("/api/supplier-invoices/:id/approve", deps.DeliveryHandler.ApproveInvoice)
			secured.POST("/api/supplier-invoices/:id/reject",  deps.DeliveryHandler.RejectInvoice)
			secured.GET ("/api/supplier-invoices/:id/match-report", deps.DeliveryHandler.GetMatchReport)
		}

		// Users
		if deps.UsersHandler != nil {
			secured.GET ("/api/users",             deps.UsersHandler.ListUsers)
			secured.POST("/api/users",             deps.UsersHandler.CreateUser)
			secured.PUT ("/api/users/:id/role",    deps.UsersHandler.UpdateRole)
			secured.PUT ("/api/users/:id/password",deps.UsersHandler.UpdatePassword)
			secured.DELETE("/api/users/:id",       deps.UsersHandler.DeleteUser)
		}

		// Build Orders
		if deps.BuildOrderHandler != nil {
			secured.GET ("/api/build-orders",                        deps.BuildOrderHandler.ListBuildOrders)
			secured.POST("/api/build-orders",                        deps.BuildOrderHandler.CreateBuildOrder)
			secured.GET ("/api/build-orders/dashboard",              deps.BuildOrderHandler.GetDashboard)
			secured.GET ("/api/build-orders/:id",                    deps.BuildOrderHandler.GetBuildOrder)
			secured.POST("/api/build-orders/:id/release",            deps.BuildOrderHandler.ReleaseBuildOrder)
			secured.POST("/api/build-orders/:id/start",              deps.BuildOrderHandler.StartBuildOrder)
			secured.POST("/api/build-orders/:id/complete",           deps.BuildOrderHandler.CompleteBuildOrder)
			secured.POST("/api/build-orders/:id/issue-components",    deps.BuildOrderHandler.IssueComponents)
			secured.POST("/api/build-orders/:id/cancel",             deps.BuildOrderHandler.CancelBuildOrder)
		}

		// Quality Gate
		if deps.QualityHandler != nil {
			secured.GET ("/api/quality-checks/dashboard",            deps.QualityHandler.GetDashboard)
			secured.GET ("/api/quality-checks",                      deps.QualityHandler.ListChecks)
			secured.GET ("/api/quality-checks/:id",                  deps.QualityHandler.GetCheck)
			secured.POST("/api/quality-checks/:id/start",            deps.QualityHandler.StartInspection)
			secured.POST("/api/quality-checks/:id/record-result",    deps.QualityHandler.RecordResult)
			secured.POST("/api/quality-checks/:id/findings",         deps.QualityHandler.AddFinding)
		}

		// Phase 4: DealFlow & RouteRunner
		if deps.DealFlowHandler != nil {
			com := secured.Group("/api/com")
			com.GET("/customers",     deps.DealFlowHandler.ListCustomers)
			com.POST("/customers",    deps.DealFlowHandler.CreateCustomer)
			
			com.GET("/sales-orders",              deps.DealFlowHandler.ListSalesOrders)
			com.POST("/sales-orders",             deps.DealFlowHandler.CreateSalesOrder)
			com.GET("/sales-orders/:id",          deps.DealFlowHandler.GetSalesOrder)
			com.POST("/sales-orders/:id/confirm", deps.DealFlowHandler.ConfirmSalesOrder)
			com.POST("/sales-orders/:id/cancel",  deps.DealFlowHandler.CancelSalesOrder)
			
			com.GET("/deal-flow/dashboard",       deps.DealFlowHandler.GetDashboard)
		}

		if deps.RouteRunnerHandler != nil {
			secured.GET ("/api/shipments",                              deps.RouteRunnerHandler.ListShipments)
			secured.POST("/api/shipments",                              deps.RouteRunnerHandler.CreateShipment)
			secured.GET ("/api/shipments/:id",                          deps.RouteRunnerHandler.GetShipment)
			secured.PUT ("/api/shipments/:id/lines/:line_id/assign-hu", deps.RouteRunnerHandler.AssignHU)
			secured.POST("/api/shipments/:id/pack",                     deps.RouteRunnerHandler.PackShipment)
			secured.POST("/api/shipments/:id/dispatch",                 deps.RouteRunnerHandler.DispatchShipment)
			secured.POST("/api/shipments/:id/confirm-delivery",         deps.RouteRunnerHandler.ConfirmDelivery)
		}
	}

	return r
}
