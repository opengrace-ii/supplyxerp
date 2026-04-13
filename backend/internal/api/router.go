package api

import (
	"net/http"

	"erplite/backend/internal/api/handlers"
	"erplite/backend/internal/api/middleware"
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
	ProductHandler   *handlers.ProductHandler
	BarcodeHandler   *handlers.BarcodeHandler
	GRHandler        *handlers.GRHandler
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
		secured.GET("/api/gr/stats", deps.GRHandler.GetStats)
		secured.GET("/api/warehouse-tasks", deps.GRHandler.ListPutawayTasks)
		secured.POST("/api/warehouse-tasks/:id/complete", deps.GRHandler.CompletePutaway)
	}

	return r
}
