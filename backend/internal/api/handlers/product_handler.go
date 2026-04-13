package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"erplite/backend/internal/agent/material"
	"erplite/backend/internal/repository"
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
	idStr := c.Param("public_id") // Could be public_id of product, wait the route is /api/products/:id/stock

	// We only have product public_id or integer ID? Usually frontend sends public_id.
	// But let's look up product.id
	var productID int64
	var baseUnit string
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id, base_unit FROM products WHERE public_id = $1 AND tenant_id = $2", idStr, tenantID).Scan(&productID, &baseUnit)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT z.code, z.name, z.zone_type, SUM(hu.quantity) as qty
		FROM handling_units hu
		JOIN zones z ON hu.zone_id = z.id
		WHERE hu.product_id = $1 AND hu.tenant_id = $2 AND hu.status = 'AVAILABLE'
		GROUP BY z.id, z.code, z.name, z.zone_type
	`, productID, tenantID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stock"})
		return
	}
	defer rows.Close()

	var breakdown []gin.H
	var total float64
	for rows.Next() {
		var zCode, zName, zType string
		var qty float64
		if err := rows.Scan(&zCode, &zName, &zType, &qty); err == nil {
			breakdown = append(breakdown, gin.H{
				"zone_code": zCode,
				"zone_name": zName,
				"zone_type": zType,
				"quantity":  qty,
			})
			total += qty
		}
	}

	if breakdown == nil {
		breakdown = []gin.H{}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_quantity": total,
		"unit": baseUnit,
		"location_breakdown": breakdown,
	})
}
