package handlers

import (
	"net/http"
	"strconv"

	"supplyxerp/backend/internal/agent/material"
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
	Code        string `json:"code" binding:"required"`
	Name        string `json:"name" binding:"required"`
	BaseUnit    string `json:"base_unit" binding:"required"`
	Description string `json:"description"`
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
		Code:        req.Code,
		Name:        req.Name,
		BaseUnit:    req.BaseUnit,
		Description: req.Description,
		ActorID:     userID,
		TenantID:    tenantID,
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

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
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	err := h.Repo.Products.Update(c.Request.Context(), tenantID, publicID, req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

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
	tenantID := c.MustGet("tenant_id").(int64)
	idStr := c.Param("public_id")

	var productID int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM products WHERE public_id = $1 AND tenant_id = $2", idStr, tenantID).Scan(&productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	detail, err := h.Repo.Stock.GetProductDetail(c.Request.Context(), tenantID, productID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stock detail"})
		return
	}

	// Transform to match old format for backward compatibility
	summary := detail["product"].(repository.ProductStockSummary)
	zones := detail["zone_breakdown"].([]map[string]any)

	c.JSON(http.StatusOK, gin.H{
		"total_quantity":     summary.TotalQuantity,
		"unit":               summary.BaseUnit,
		"location_breakdown": zones,
	})
}
