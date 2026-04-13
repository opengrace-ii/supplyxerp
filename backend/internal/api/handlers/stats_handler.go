package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StatsHandler struct {
	Pool *pgxpool.Pool
}

func NewStatsHandler(pool *pgxpool.Pool) *StatsHandler {
	return &StatsHandler{Pool: pool}
}

func (h *StatsHandler) GetStockFlowStats(c *gin.Context) {
	tenantID, _ := c.Get("tenant_id")
	
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var scansToday int64
	var unitsHandled float64
	var activeTasks int64
	var exceptions int64

	ctx := c.Request.Context()

	// Scans today
	err := h.Pool.QueryRow(ctx, 
		"SELECT COUNT(*) FROM inventory_events WHERE tenant_id = $1 AND created_at >= $2", 
		tenantID, today).Scan(&scansToday)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scans"})
		return
	}

	// Units handled today
	err = h.Pool.QueryRow(ctx, 
		"SELECT COALESCE(SUM(quantity), 0) FROM inventory_events WHERE tenant_id = $1 AND created_at >= $2", 
		tenantID, today).Scan(&unitsHandled)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch units handled"})
		return
	}

	// Active tasks
	err = h.Pool.QueryRow(ctx, 
		"SELECT COUNT(*) FROM warehouse_tasks WHERE tenant_id = $1 AND status = 'OPEN'", 
		tenantID).Scan(&activeTasks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active tasks"})
		return
	}

	// Exceptions
	err = h.Pool.QueryRow(ctx, 
		"SELECT COUNT(*) FROM blocked_operations WHERE tenant_id = $1 AND created_at >= $2", 
		tenantID, today).Scan(&exceptions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch exceptions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"scans_today":   scansToday,
		"units_handled": unitsHandled,
		"active_tasks":  activeTasks,
		"exceptions":    exceptions,
	})
}
