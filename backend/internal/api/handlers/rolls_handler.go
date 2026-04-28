package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"supplyxerp/backend/internal/repository"
)

type RollsHandler struct {
	Repo *repository.UnitOfWork
}

func NewRollsHandler(repo *repository.UnitOfWork) *RollsHandler {
	return &RollsHandler{Repo: repo}
}

// GetProductRolls returns all roll-tracked HUs for a product.
// GET /api/products/:id/rolls
func (h *RollsHandler) GetProductRolls(c *gin.Context) {
	tenantID := mustTenantID(c)
	productID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	rows, err := h.Repo.HU.GetDb().Query(c.Request.Context(), `
		SELECT 
			hu.id,
			hu.code        AS hu_code,
			hu.serial_number,
			hu.roll_prefix,
			hu.roll_sequence,
			hu.quantity,
			hu.unit,
			hu.stock_type,
			hu.status,
			z.code         AS zone_code,
			z.zone_type,
			ie_last.event_type AS last_event
		FROM handling_units hu
		JOIN zones z ON z.id = hu.zone_id
		LEFT JOIN LATERAL (
			SELECT event_type
			FROM inventory_events
			WHERE hu_id = hu.id
			ORDER BY created_at DESC
			LIMIT 1
		) ie_last ON true
		WHERE hu.tenant_id = $1
		  AND hu.product_id = $2
		  AND hu.serial_number IS NOT NULL
		ORDER BY hu.roll_prefix, hu.roll_sequence ASC
	`, tenantID, productID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query rolls"})
		return
	}
	defer rows.Close()

	type RollRow struct {
		HUID          int64   `json:"hu_id"`
		HUCode        string  `json:"hu_code"`
		SerialNumber  string  `json:"serial_number"`
		RollPrefix    *string `json:"roll_prefix"`
		RollSequence  *int    `json:"roll_sequence"`
		Quantity      float64 `json:"quantity"`
		Unit          string  `json:"unit"`
		StockType     string  `json:"stock_type"`
		Status        string  `json:"status"`
		ZoneCode      string  `json:"zone_code"`
		ZoneType      string  `json:"zone_type"`
		LastEvent     *string `json:"last_event"`
	}

	var rolls []RollRow
	for rows.Next() {
		var r RollRow
		if err := rows.Scan(
			&r.HUID, &r.HUCode, &r.SerialNumber,
			&r.RollPrefix, &r.RollSequence,
			&r.Quantity, &r.Unit, &r.StockType, &r.Status,
			&r.ZoneCode, &r.ZoneType, &r.LastEvent,
		); err == nil {
			rolls = append(rolls, r)
		}
	}

	c.JSON(http.StatusOK, gin.H{"rolls": rolls, "count": len(rolls)})
}
