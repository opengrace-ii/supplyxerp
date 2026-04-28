package handlers

import (
	"net/http"
	"strconv"

	"supplyxerp/backend/internal/agent/material"
	"supplyxerp/backend/internal/db/dbgen"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductHandler struct {
	Repo  *repository.UnitOfWork
	Agent *material.Agent
	Pool  *pgxpool.Pool
}

func NewProductHandler(repo *repository.UnitOfWork, agent *material.Agent, pool *pgxpool.Pool) *ProductHandler {
	return &ProductHandler{Repo: repo, Agent: agent, Pool: pool}
}

func (h *ProductHandler) ListProducts(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")
	
	limit, _ := strconv.ParseInt(limitStr, 10, 32)
	offset, _ := strconv.ParseInt(offsetStr, 10, 32)

	products, err := h.Repo.Products.List(c.Request.Context(), tenantID, int32(limit), int32(offset))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list products"})
		return
	}

	count, _ := h.Repo.Products.Count(c.Request.Context(), tenantID)

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    count,
	})
}

type CreateProductRequest struct {
	Code              string  `json:"code" binding:"required"`
	Name              string  `json:"name" binding:"required"`
	BaseUnit          string  `json:"base_unit" binding:"required"`
	Description       string  `json:"description"`
	MaterialCategory  string  `json:"material_category"`
	ProcurementType   string  `json:"procurement_type"`
	PlanningMethod    string  `json:"planning_method"`
	BatchTracked      bool    `json:"batch_tracked"`
}

func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)

	// Execute via Agent Pipeline
	product, err := h.Agent.CreateProduct(c.Request.Context(), h.Repo, material.CreateProductParams{
		Code:             req.Code,
		Name:             req.Name,
		BaseUnit:         req.BaseUnit,
		Description:      req.Description,
		MaterialCategory: req.MaterialCategory,
		ProcurementType:  req.ProcurementType,
		PlanningMethod:   req.PlanningMethod,
		BatchTracked:     req.BatchTracked,
		ActorID:          userID,
		TenantID:         tenantID,
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Audit
	h.Repo.Audit.Log(c.Request.Context(), tenantID, userID, "PRODUCT_CREATED", "product", product.PublicID, nil, product)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    product,
	})
}

func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	idStr := c.Param("public_id")
	var publicID pgtype.UUID
	if err := publicID.Scan(idStr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req struct {
		Name              string  `json:"name" binding:"required"`
		Description       string  `json:"description"`
		QcOnGr            bool    `json:"qc_on_gr"`
		QcOnOutput        bool    `json:"qc_on_output"`
		GrDefaultStockType string  `json:"gr_default_stock_type"`
		MaterialCategory  string  `json:"material_category"`
		ProductGroup      string  `json:"product_group"`
		ProcurementType   string  `json:"procurement_type"`
		PlanningMethod    string  `json:"planning_method"`
		ReorderPoint      float64 `json:"reorder_point"`
		SafetyStock       float64 `json:"safety_stock"`
		MinLotSize        float64 `json:"min_lot_size"`
		MaxLotSize        float64 `json:"max_lot_size"`
		PlannedDeliveryDays int   `json:"planned_delivery_days"`
		InHouseLeadDays    int    `json:"in_house_lead_days"`
		PurchaseUnit       string  `json:"purchase_unit"`
		GrProcessingDays   int    `json:"gr_processing_days"`
		BatchTracked       bool   `json:"batch_tracked"`
		StorageConditions  string  `json:"storage_conditions"`
		ShelfLifeDays      int    `json:"shelf_life_days"`
		MinRemainingShelfLifeDays int `json:"min_remaining_shelf_life_days"`
		PriceControl       string  `json:"price_control"`
		StandardPrice      float64 `json:"standard_price"`
		SalesUnit          string  `json:"sales_unit"`
		MinOrderQuantity   float64 `json:"min_order_quantity"`
		AvailabilityCheck  string  `json:"availability_check"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := mustTenantID(c)
	userID := mustUserID(c)
	
	err := h.Repo.Products.Update(c.Request.Context(), tenantID, publicID, dbgen.Product{
		Name:               req.Name,
		Description:        stringToText(req.Description),
		QcOnGr:             req.QcOnGr,
		QcOnOutput:         req.QcOnOutput,
		GrDefaultStockType: req.GrDefaultStockType,
		MaterialCategory:   pgtype.Text{String: req.MaterialCategory, Valid: req.MaterialCategory != ""},
		ProductGroup:       pgtype.Text{String: req.ProductGroup, Valid: req.ProductGroup != ""},
		ProcurementType:    req.ProcurementType,
		PlanningMethod:     pgtype.Text{String: req.PlanningMethod, Valid: req.PlanningMethod != ""},
		ReorderPoint:       numericFromFloat(req.ReorderPoint),
		SafetyStock:        numericFromFloat(req.SafetyStock),
		MinLotSize:         numericFromFloat(req.MinLotSize),
		MaxLotSize:         numericFromFloat(req.MaxLotSize),
		PlannedDeliveryDays: pgtype.Int4{Int32: int32(req.PlannedDeliveryDays), Valid: true},
		InHouseLeadDays:    pgtype.Int4{Int32: int32(req.InHouseLeadDays), Valid: true},
		PurchaseUnit:       pgtype.Text{String: req.PurchaseUnit, Valid: req.PurchaseUnit != ""},
		GrProcessingDays:   pgtype.Int4{Int32: int32(req.GrProcessingDays), Valid: true},
		BatchTracked:       pgtype.Bool{Bool: req.BatchTracked, Valid: true},
		StorageConditions:  pgtype.Text{String: req.StorageConditions, Valid: req.StorageConditions != ""},
		ShelfLifeDays:      pgtype.Int4{Int32: int32(req.ShelfLifeDays), Valid: true},
		MinRemainingShelfLifeDays: pgtype.Int4{Int32: int32(req.MinRemainingShelfLifeDays), Valid: true},
		PriceControl:       req.PriceControl,
		StandardPrice:      numericFromFloat(req.StandardPrice),
		SalesUnit:          pgtype.Text{String: req.SalesUnit, Valid: req.SalesUnit != ""},
		MinOrderQuantity:   numericFromFloat(req.MinOrderQuantity),
		AvailabilityCheck:  pgtype.Text{String: req.AvailabilityCheck, Valid: req.AvailabilityCheck != ""},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	// Audit
	h.Repo.Audit.Log(c.Request.Context(), tenantID, userID, "PRODUCT_UPDATED", "product", publicID, nil, req)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *ProductHandler) UpdateUOM(c *gin.Context) {
	idStr := c.Param("public_id")
	var publicID pgtype.UUID
	if err := publicID.Scan(idStr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID format"})
		return
	}

	var req struct {
		Conversions []any `json:"conversions" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	err := h.Repo.Products.UpdateUOMConversions(c.Request.Context(), tenantID, publicID, req.Conversions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update UOM"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *ProductHandler) GetStock(c *gin.Context) {
	tenantID := mustTenantID(c)
	idStr := c.Param("public_id")

	var productID int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM products WHERE public_id = $1 AND tenant_id = $2", idStr, tenantID).Scan(&productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	queries := dbgen.New(h.Repo.Zones.GetDb())
	breakdown, err := queries.GetStockByMaterialAndTenant(c.Request.Context(), dbgen.GetStockByMaterialAndTenantParams{
		TenantID:  tenantID,
		ProductID: productID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stock breakdown"})
		return
	}

	var total float64
	for _, b := range breakdown {
		total += float64(b.Quantity)
	}

	c.JSON(http.StatusOK, gin.H{
		"total_quantity":     total,
		"location_breakdown": breakdown,
	})
}
