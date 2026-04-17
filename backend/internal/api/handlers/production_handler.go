package handlers

import (
	"net/http"

	"supplyxerp/backend/internal/agent/inventory"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductionHandler struct {
	Repo     *repository.UnitOfWork
	Workflow *inventory.ProductionWorkflow
	Pool     *pgxpool.Pool
}

func NewProductionHandler(repo *repository.UnitOfWork, workflow *inventory.ProductionWorkflow, pool *pgxpool.Pool) *ProductionHandler {
	return &ProductionHandler{Repo: repo, Workflow: workflow, Pool: pool}
}

func (h *ProductionHandler) Move(c *gin.Context) {
	var req inventory.MoveParams
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.TenantID = c.MustGet("tenant_id").(int64)
	req.ActorUserID = c.MustGet("user_id").(int64)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	uow := repository.NewUnitOfWork(tx)
	if err := h.Workflow.MoveHU(c.Request.Context(), uow, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *ProductionHandler) Split(c *gin.Context) {
	var req inventory.SplitParams
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.TenantID = c.MustGet("tenant_id").(int64)
	req.ActorUserID = c.MustGet("user_id").(int64)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	uow := repository.NewUnitOfWork(tx)
	childCode, err := h.Workflow.SplitHU(c.Request.Context(), uow, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "child_hu_code": childCode})
}

func (h *ProductionHandler) Consume(c *gin.Context) {
	var req inventory.ConsumeParams
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.TenantID = c.MustGet("tenant_id").(int64)
	req.ActorUserID = c.MustGet("user_id").(int64)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	uow := repository.NewUnitOfWork(tx)
	if err := h.Workflow.ConsumeHU(c.Request.Context(), uow, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *ProductionHandler) GetLineage(c *gin.Context) {
	huCode := c.Param("hu_code")
	tenantID := c.MustGet("tenant_id").(int64)

	// We use the StockRepository for lineage queries as it focuses on stock intelligence
	rows, err := h.Repo.Stock.GetHULineage(c.Request.Context(), tenantID, huCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch lineage"})
		return
	}

	c.JSON(http.StatusOK, rows)
}
