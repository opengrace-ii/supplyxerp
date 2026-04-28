package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"supplyxerp/backend/internal/agent/inventory"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type StockHandler struct {
	Repo  *repository.UnitOfWork
	Agent *inventory.Agent
}

func NewStockHandler(repo *repository.UnitOfWork, agent *inventory.Agent) *StockHandler {
	return &StockHandler{Repo: repo, Agent: agent}
}

func (h *StockHandler) GetOverview(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	overview, err := h.Repo.Stock.GetOverview(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get overview"})
		return
	}
	c.JSON(http.StatusOK, overview)
}

func (h *StockHandler) ListProducts(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	search := c.Query("search")
	format := c.Query("format")
	
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	products, total, err := h.Repo.Stock.ListProducts(c.Request.Context(), tenantID, search, int32(limit), int32(offset))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list products"})
		return
	}

	if format == "csv" {
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=supplyxerp_stock_%d_%s.csv", tenantID, time.Now().Format("2006-01-02")))
		
		writer := csv.NewWriter(c.Writer)
		defer writer.Flush()

		writer.Write([]string{"Product Code", "Product Name", "Unit", "Qty on Hand", "HU Count", "Zones", "Last Movement Date"})
		for _, p := range products {
			lastMov := ""
			if p.LastMovementAt.Valid {
				lastMov = p.LastMovementAt.Time.Format(time.RFC3339)
			}
			writer.Write([]string{
				p.ProductCode,
				p.ProductName,
				p.BaseUnit,
				fmt.Sprintf("%.4f", p.TotalQuantity),
				strconv.FormatInt(p.TotalHUCount, 10),
				strconv.FormatInt(p.ZoneCount, 10),
				lastMov,
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"products": products,
		"total":    total,
	})
}

func (h *StockHandler) GetProductDetail(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idStr := c.Param("id")
	productID, _ := strconv.ParseInt(idStr, 10, 64)

	detail, err := h.Repo.Stock.GetProductDetail(c.Request.Context(), tenantID, productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product detail not found"})
		return
	}
	c.JSON(http.StatusOK, detail)
}

func (h *StockHandler) ListZones(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	zones, err := h.Repo.Stock.ListZones(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list zones"})
		return
	}
	c.JSON(http.StatusOK, zones)
}

func (h *StockHandler) GetHUDetail(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	huCode := c.Param("hu_code")

	// Get HU ID first
	var huID int64
	var prodCode, prodName, status string
	var qty float64
	var zoneCode string
	err := h.Repo.HU.GetDb().QueryRow(c.Request.Context(), `
		SELECT hu.id, p.code, p.name, hu.quantity, hu.status, z.code
		FROM handling_units hu
		JOIN products p ON p.id = hu.product_id
		JOIN zones z ON z.id = hu.zone_id
		WHERE hu.code = $1 AND hu.tenant_id = $2
	`, huCode, tenantID).Scan(&huID, &prodCode, &prodName, &qty, &status, &zoneCode)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "HU not found"})
		return
	}

	// Get history
	history, err := h.Repo.Stock.ListMovements(c.Request.Context(), tenantID, 0, 0, "", 1) // First 50 movements
	// Filter history for this HU
	var huHistory []repository.MovementEvent
	for _, e := range history {
		if e.HuID == huID {
			huHistory = append(huHistory, e)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"hu": map[string]any{
			"hu_code":          huCode,
			"product_code":     prodCode,
			"product_name":     prodName,
			"current_quantity": qty,
			"current_zone":     zoneCode,
			"status":           status,
		},
		"movement_history": huHistory,
	})
}

func (h *StockHandler) GetHUChildren(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	huCode := c.Param("hu_code")

	// 1. Get Parent HU
	var parent struct {
		ID            int64   `json:"id"`
		HUCode        string  `json:"hu_code"`
		HULevel       string  `json:"hu_level"`
		ChildCount    int     `json:"child_count"`
		ZoneCode      string  `json:"zone_code"`
		TotalQuantity float64 `json:"total_quantity"`
		Unit          string  `json:"unit"`
	}

	err := h.Repo.HU.GetDb().QueryRow(c.Request.Context(), `
		SELECT hu.id, hu.code, hu.hu_level, hu.child_count, z.code, hu.quantity, p.base_unit
		FROM handling_units hu
		JOIN zones z ON z.id = hu.zone_id
		JOIN products p ON p.id = hu.product_id
		WHERE hu.code = $1 AND hu.tenant_id = $2
	`, huCode, tenantID).Scan(&parent.ID, &parent.HUCode, &parent.HULevel, &parent.ChildCount, &parent.ZoneCode, &parent.TotalQuantity, &parent.Unit)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Parent HU not found"})
		return
	}

	// 2. Get Children
	rows, err := h.Repo.HU.GetDb().Query(c.Request.Context(), `
		SELECT hu.code, COALESCE(hu.serial_number, ''), hu.quantity, p.base_unit, hu.status
		FROM handling_units hu
		JOIN products p ON p.id = hu.product_id
		WHERE hu.parent_hu_id = $1 AND hu.tenant_id = $2
		ORDER BY hu.code
	`, parent.ID, tenantID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load children"})
		return
	}
	defer rows.Close()

	children := []any{}
	for rows.Next() {
		var child struct {
			HUCode       string  `json:"hu_code"`
			SerialNo     string  `json:"serial_number"`
			Quantity     float64 `json:"quantity"`
			Unit         string  `json:"unit"`
			StockType    string  `json:"stock_type"`
		}
		if err := rows.Scan(&child.HUCode, &child.SerialNo, &child.Quantity, &child.Unit, &child.StockType); err == nil {
			children = append(children, child)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"parent":   parent,
		"children": children,
	})
}

func (h *StockHandler) ListMovements(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	
	prodID, _ := strconv.ParseInt(c.Query("product_id"), 10, 64)
	zoneID, _ := strconv.ParseInt(c.Query("zone_id"), 10, 64)
	evtType := c.Query("event_type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))

	movements, err := h.Repo.Stock.ListMovements(c.Request.Context(), tenantID, prodID, zoneID, evtType, int32(page))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list movements"})
		return
	}
	c.JSON(http.StatusOK, movements)
}

func (h *StockHandler) GetAlerts(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	alerts, err := h.Repo.Stock.GetAlerts(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get alerts"})
		return
	}
	c.JSON(http.StatusOK, alerts)
}

func (h *StockHandler) AdjustStock(c *gin.Context) {
	var req struct {
		HuID          int64   `json:"hu_id" binding:"required"`
		PhysicalCount float64 `json:"physical_count"`
		Reason        string  `json:"reason" binding:"required,min=5"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)

	err := h.Agent.PostAdjustmentEvent(c.Request.Context(), h.Repo, tenantID, userID, req.HuID, req.PhysicalCount, req.Reason)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *StockHandler) ListAdjustments(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	adjustments, err := h.Repo.Stock.ListAdjustments(c.Request.Context(), tenantID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list adjustments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"adjustments": adjustments})
}
