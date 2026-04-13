package handlers

import (
	"net/http"

	"erplite/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BarcodeHandler struct {
	Repo *repository.UnitOfWork
	Pool *pgxpool.Pool
}

func NewBarcodeHandler(repo *repository.UnitOfWork, pool *pgxpool.Pool) *BarcodeHandler {
	return &BarcodeHandler{Repo: repo, Pool: pool}
}

type RegisterBarcodeRequest struct {
	Code       string `json:"code" binding:"required"`
	EntityType string `json:"entity_type" binding:"required"`
	EntityID   int64  `json:"entity_id" binding:"required"`
}

func (h *BarcodeHandler) Register(c *gin.Context) {
	var req RegisterBarcodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)

	// Check if barcode already exists
	_, err := h.Repo.Barcodes.GetByCode(c.Request.Context(), tenantID, req.Code)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Barcode already registered"})
		return
	}

	err = h.Repo.Barcodes.Create(c.Request.Context(), repository.CreateBarcodeParams{
		TenantID:   tenantID,
		Code:       req.Code,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register barcode"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func (h *BarcodeHandler) Deactivate(c *gin.Context) {
	code := c.Param("code")
	tenantID := c.MustGet("tenant_id").(int64)

	err := h.Repo.Barcodes.Deactivate(c.Request.Context(), tenantID, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate barcode"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
