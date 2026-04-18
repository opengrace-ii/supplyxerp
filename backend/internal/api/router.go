package api

import (
	"net/http"

	"supplyxerp/backend/internal/api/handlers"
	"supplyxerp/backend/internal/api/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.GET("/ws", deps.WSHandler.Handle)

	auth := r.Group("/api/auth")
	{
		auth.POST("/login", deps.AuthHandler.Login)
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
		secured.POST("/api/purchase-orders/:id/submit", deps.PurchasingHandler.SubmitPO)
		secured.POST("/api/purchase-orders/:id/approve", middleware.RequireRole("ADMIN", "WAREHOUSE_MANAGER"), deps.PurchasingHandler.ApprovePO)
		secured.POST("/api/purchase-orders/:id/reject", middleware.RequireRole("ADMIN", "WAREHOUSE_MANAGER"), deps.PurchasingHandler.RejectPO)

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
	}

	return r
}
