package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"supplyxerp/backend/internal/db/dbgen"
)

// VendorScorecardHandler — expose scorecard data and trigger recalculation
type VendorScorecardHandler struct {
	queries *dbgen.Queries
}

func NewVendorScorecardHandler(q *dbgen.Queries) *VendorScorecardHandler {
	return &VendorScorecardHandler{queries: q}
}

// GET /api/com/vendor-scorecards — list all with auto_score
func (h *VendorScorecardHandler) ListScorecards(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	scorecards, err := h.queries.ListVendorScorecards(c, pgtype.Int8{Int64: tenantID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": scorecards})
}

// GET /api/com/vendor-scorecards/summary — dashboard KPIs
func (h *VendorScorecardHandler) GetSummary(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	summary, err := h.queries.GetScorecardSummary(c, pgtype.Int8{Int64: tenantID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": summary})
}

// GET /api/com/vendor-scorecards/:supplier_id — one supplier scorecard
func (h *VendorScorecardHandler) GetScorecard(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	supplierID, _ := strconv.ParseInt(c.Param("supplier_id"), 10, 64)

	sc, err := h.queries.GetVendorScorecardBySupplier(c,
		dbgen.GetVendorScorecardBySupplierParams{
			TenantID:   pgtype.Int8{Int64: tenantID, Valid: true},
			SupplierID: supplierID,
		})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "scorecard not found"})
		return
	}

	events, _ := h.queries.ListScorecardEvents(c,
		dbgen.ListScorecardEventsParams{
			TenantID:   tenantID,
			SupplierID: supplierID,
			Limit:      20,
			Offset:     0,
		})

	c.JSON(http.StatusOK, gin.H{"data": sc, "events": events})
}

// POST /api/com/vendor-scorecards/:supplier_id/recalculate
// Triggers the scoring engine for one supplier
func (h *VendorScorecardHandler) Recalculate(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	supplierID, _ := strconv.ParseInt(c.Param("supplier_id"), 10, 64)

	if err := CalculateVendorScore(c, h.queries, tenantID, supplierID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "calculation failed: " + err.Error()})
		return
	}

	// Return the updated scorecard
	sc, _ := h.queries.GetVendorScorecardBySupplier(c,
		dbgen.GetVendorScorecardBySupplierParams{
			TenantID:   pgtype.Int8{Int64: tenantID, Valid: true},
			SupplierID: supplierID,
		})

	c.JSON(http.StatusOK, gin.H{
		"data":    sc,
		"message": "Scorecard recalculated successfully",
	})
}

// POST /api/com/vendor-scorecards/:supplier_id/events
// Manually record a scorecard event (used by QC, GR, Invoice modules)
func (h *VendorScorecardHandler) RecordEvent(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	supplierID, _ := strconv.ParseInt(c.Param("supplier_id"), 10, 64)
	userID := c.MustGet("user_id").(int64)

	var req struct {
		EventType     string  `json:"event_type"     binding:"required"`
		ReferenceType string  `json:"reference_type"`
		ReferenceID   int64   `json:"reference_id"`
		ReferenceCode string  `json:"reference_code"`
		ScoreImpact   float64 `json:"score_impact"`
		Notes         string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.queries.RecordScorecardEvent(c,
		dbgen.RecordScorecardEventParams{
			TenantID:      tenantID,
			SupplierID:    supplierID,
			EventType:     req.EventType,
			ReferenceType: pgtype.Text{String: req.ReferenceType, Valid: req.ReferenceType != ""},
			ReferenceID:   pgtype.Int8{Int64: req.ReferenceID, Valid: req.ReferenceID != 0},
			ReferenceCode: pgtype.Text{String: req.ReferenceCode, Valid: req.ReferenceCode != ""},
			ScoreImpact:   numericFromFloat(req.ScoreImpact),
			Notes:         pgtype.Text{String: req.Notes, Valid: req.Notes != ""},
			RecordedBy:    pgtype.Int8{Int64: userID, Valid: true},
		})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Auto-recalculate after every event
	_ = CalculateVendorScore(c, h.queries, tenantID, supplierID)

	c.JSON(http.StatusCreated, gin.H{
		"data":    event,
		"message": "Event recorded and score recalculated",
	})
}
