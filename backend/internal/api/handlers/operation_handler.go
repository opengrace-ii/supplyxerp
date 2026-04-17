package handlers

import (
	"net/http"

	"supplyxerp/backend/internal/agent/barcode"
	"supplyxerp/backend/internal/agent/warehouse"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OperationHandler struct {
	Repo         *repository.UnitOfWork
	Agent        *warehouse.Agent
	BarcodeAgent *barcode.Agent
	Pool         *pgxpool.Pool
}

func NewOperationHandler(repo *repository.UnitOfWork, warehouseAgent *warehouse.Agent, barcodeAgent *barcode.Agent, pool *pgxpool.Pool) *OperationHandler {
	return &OperationHandler{Repo: repo, Agent: warehouseAgent, BarcodeAgent: barcodeAgent, Pool: pool}
}

type ScanRequest struct {
	Barcode string `json:"barcode" binding:"required"`
}

func (h *OperationHandler) Scan(c *gin.Context) {
	var req ScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)

	// Centralized resolution via BarcodeAgent
	resolved, err := h.BarcodeAgent.Resolve(c.Request.Context(), h.Repo, tenantID, req.Barcode)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// Enrich HU with open task info
	var openTask any
	if resolved.Type == "HU" {
		t, err := h.Repo.WarehouseTasks.ListOpenByTenant(c.Request.Context(), tenantID)
		if err == nil {
			for _, task := range t {
				if task.HuID == resolved.ID {
					openTask = task
					break
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"type":      resolved.Type,
		"data":      resolved.Data,
		"open_task": openTask,
	})
}

type MoveRequest struct {
	HUBarcode       string `json:"hu_barcode" binding:"required"`
	LocationBarcode string `json:"to_location_barcode" binding:"required"`
}

func (h *OperationHandler) Move(c *gin.Context) {
	var req MoveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)

	// Execute movement within a transaction
	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	uow := repository.NewUnitOfWork(tx)
	
	err = h.Agent.MoveHU(c.Request.Context(), uow, warehouse.MoveParams{
		HUBarcode:      req.HUBarcode,
		ToLocationCode: req.LocationBarcode,
		ActorUserID:    actorID,
		TenantID:       tenantID,
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
