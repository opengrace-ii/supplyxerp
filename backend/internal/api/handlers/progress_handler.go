package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/logger"
)

type ProgressHandler struct {
	Pool *pgxpool.Pool
}

func NewProgressHandler(pool *pgxpool.Pool) *ProgressHandler {
	return &ProgressHandler{Pool: pool}
}

// Request Types
type InitializeProgressRequest struct {
	ItemNo       int    `json:"item_no" binding:"required"`
	ScenarioCode string `json:"scenario_code" binding:"required"`
	BaselineDate string `json:"baseline_date" binding:"required"` // YYYY-MM-DD
}

type UpdateProgressEventRequest struct {
	ActualDate   *string `json:"actual_date"`   // YYYY-MM-DD
	ForecastDate *string `json:"forecast_date"` // YYYY-MM-DD
	Notes        string  `json:"notes"`
}

// ─────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────

// GET /api/po/scenarios
func (h *ProgressHandler) GetScenarios(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT s.code, s.name, s.description, 
		       e.event_code, e.event_description, e.sequence_no, e.planned_offset_days
		FROM po_tracking_scenarios s
		JOIN po_tracking_scenario_events e ON s.code = e.scenario_code
		ORDER BY s.code, e.sequence_no`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Event struct {
		Code       string `json:"event_code"`
		Desc       string `json:"event_description"`
		Seq        int    `json:"sequence_no"`
		OffsetDays int    `json:"planned_offset_days"`
	}
	type Scenario struct {
		Code   string  `json:"code"`
		Name   string  `json:"name"`
		Desc   string  `json:"description"`
		Events []Event `json:"events"`
	}

	scenarios := make(map[string]*Scenario)
	var codes []string

	for rows.Next() {
		var sCode, sName, sDesc, eCode, eDesc string
		var eSeq, eOffset int
		if err := rows.Scan(&sCode, &sName, &sDesc, &eCode, &eDesc, &eSeq, &eOffset); err != nil {
			continue
		}
		if _, ok := scenarios[sCode]; !ok {
			scenarios[sCode] = &Scenario{Code: sCode, Name: sName, Desc: sDesc, Events: []Event{}}
			codes = append(codes, sCode)
		}
		scenarios[sCode].Events = append(scenarios[sCode].Events, Event{
			Code: eCode, Desc: eDesc, Seq: eSeq, OffsetDays: eOffset,
		})
	}

	result := make([]*Scenario, 0)
	for _, c := range codes {
		result = append(result, scenarios[c])
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/po/:id/progress
func (h *ProgressHandler) GetPOProgress(c *gin.Context) {
	poID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	tenantID := c.MustGet("tenant_id").(int64)

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, item_no, event_code, event_description, sequence_no, 
		       baseline_date, plan_date, forecast_date, actual_date, 
		       variance_days, rag_status, notes
		FROM po_item_progress 
		WHERE po_id = $1 AND tenant_id = $2
		ORDER BY item_no, sequence_no`, poID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Row struct {
		ID        int64   `json:"id"`
		ItemNo    int     `json:"item_no"`
		EventCode string  `json:"event_code"`
		EventDesc string  `json:"event_description"`
		Seq       int     `json:"sequence_no"`
		Baseline  string  `json:"baseline_date"`
		Plan      string  `json:"plan_date"`
		Forecast  *string `json:"forecast_date"`
		Actual    *string `json:"actual_date"`
		Variance  int     `json:"variance_days"`
		RAG       string  `json:"rag_status"`
		Notes     string  `json:"notes"`
	}

	res := make([]Row, 0)
	for rows.Next() {
		var r Row
		var b, p time.Time
		var f, a *time.Time
		var notes *string
		if err := rows.Scan(&r.ID, &r.ItemNo, &r.EventCode, &r.EventDesc, &r.Seq, &b, &p, &f, &a, &r.Variance, &r.RAG, &notes); err != nil {
			logger.LogError("PROGRESS", "GetPOProgress", "Scan", err.Error())
			continue
		}
		r.Baseline = b.Format("2006-01-02")
		r.Plan = p.Format("2006-01-02")
		if f != nil {
			s := f.Format("2006-01-02")
			r.Forecast = &s
		}
		if a != nil {
			s := a.Format("2006-01-02")
			r.Actual = &s
		}
		if notes != nil {
			r.Notes = *notes
		}
		res = append(res, r)
	}

	c.JSON(http.StatusOK, res)
}

// POST /api/po/:id/progress/initialize
func (h *ProgressHandler) InitializeProgress(c *gin.Context) {
	poID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	tenantID := c.MustGet("tenant_id").(int64)

	var req InitializeProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	baseline, err := time.Parse("2006-01-02", req.BaselineDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid baseline date format"})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tx error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	// Get events for scenario
	type event struct {
		code   string
		desc   string
		seq    int
		offset int
	}
	events := make([]event, 0)
	
	rows, err := tx.Query(c.Request.Context(), `
		SELECT event_code, event_description, sequence_no, planned_offset_days
		FROM po_tracking_scenario_events 
		WHERE scenario_code = $1 
		ORDER BY sequence_no`, req.ScenarioCode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query error"})
		return
	}
	
	for rows.Next() {
		var e event
		if err := rows.Scan(&e.code, &e.desc, &e.seq, &e.offset); err != nil {
			continue
		}
		events = append(events, e)
	}
	rows.Close() // Close early

	for _, e := range events {
		planDate := baseline.AddDate(0, 0, e.offset)

		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO po_item_progress (
				tenant_id, po_id, item_no, event_code, event_description, 
				sequence_no, baseline_date, plan_date, rag_status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'GRAY')
			ON CONFLICT (po_id, item_no, event_code) DO UPDATE SET
				baseline_date = EXCLUDED.baseline_date,
				plan_date = EXCLUDED.plan_date,
				updated_at = now()`,
			tenantID, poID, req.ItemNo, e.code, e.desc, e.seq, baseline, planDate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("insert error: %v", err)})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "commit error"})
		return
	}

	logger.LogInfo("PROGRESS", "Initialize", fmt.Sprintf("PO %d Item %d initialized for %s", poID, req.ItemNo, req.ScenarioCode))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// PUT /api/po/:id/progress/:event_code
func (h *ProgressHandler) UpdateProgressEvent(c *gin.Context) {
	poID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	eventCode := c.Param("event_code")
	tenantID := c.MustGet("tenant_id").(int64)

	var req UpdateProgressEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Fetch current plan_date
	var planDate time.Time
	var itemNo int
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT plan_date, item_no FROM po_item_progress 
		WHERE po_id = $1 AND event_code = $2 AND tenant_id = $3`, 
		poID, eventCode, tenantID).Scan(&planDate, &itemNo)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "progress event not found"})
		return
	}

	var actual, forecast *time.Time
	if req.ActualDate != nil && *req.ActualDate != "" {
		t, _ := time.Parse("2006-01-02", *req.ActualDate)
		actual = &t
	}
	if req.ForecastDate != nil && *req.ForecastDate != "" {
		t, _ := time.Parse("2006-01-02", *req.ForecastDate)
		forecast = &t
	}

	// 2. Calculate variance and RAG
	variance := 0
	rag := "GRAY"

	if actual != nil {
		variance = int(actual.Sub(planDate).Hours() / 24)
		if variance <= 0 {
			rag = "GREEN"
		} else if variance <= 3 {
			rag = "YELLOW"
		} else {
			rag = "RED"
		}
	} else if forecast != nil {
		variance = int(forecast.Sub(planDate).Hours() / 24)
		if variance <= 0 {
			rag = "GREEN"
		} else if variance <= 5 {
			rag = "YELLOW"
		} else {
			rag = "RED"
		}
	}

	_, err = h.Pool.Exec(c.Request.Context(), `
		UPDATE po_item_progress SET
			actual_date = $1,
			forecast_date = $2,
			variance_days = $3,
			rag_status = $4,
			notes = $5,
			updated_at = now()
		WHERE po_id = $6 AND event_code = $7 AND tenant_id = $8`,
		actual, forecast, variance, rag, req.Notes, poID, eventCode, tenantID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	logger.LogInfo("PROGRESS", "Update", fmt.Sprintf("PO %d Event %s updated to %s", poID, eventCode, rag))
	c.JSON(http.StatusOK, gin.H{"success": true, "rag_status": rag, "variance_days": variance})
}

// GET /api/po/progress/dashboard
func (h *ProgressHandler) GetProgressDashboard(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)

	// Summary stats
	var total, red, yellow, green int
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT 
			COUNT(DISTINCT (po_id, item_no)),
			COUNT(*) FILTER (WHERE rag_status = 'RED'),
			COUNT(*) FILTER (WHERE rag_status = 'YELLOW'),
			COUNT(*) FILTER (WHERE rag_status = 'GREEN')
		FROM po_item_progress
		WHERE tenant_id = $1`, tenantID).Scan(&total, &red, &yellow, &green)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Alerts (red and yellow events)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT p.po_id, po.po_number, p.item_no, p.event_code, p.event_description, 
		       p.plan_date, p.forecast_date, p.variance_days, p.rag_status
		FROM po_item_progress p
		JOIN purchase_orders po ON p.po_id = po.id
		WHERE p.tenant_id = $1 AND p.rag_status IN ('RED', 'YELLOW')
		ORDER BY p.rag_status DESC, p.variance_days DESC
		LIMIT 50`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Alert struct {
		POID      int64   `json:"po_id"`
		PONumber  string  `json:"po_number"`
		ItemNo    int     `json:"item_no"`
		EventCode string  `json:"event_code"`
		EventDesc string  `json:"event_desc"`
		Plan      string  `json:"plan_date"`
		Forecast  *string `json:"forecast_date"`
		Variance  int     `json:"variance_days"`
		RAG       string  `json:"rag_status"`
	}

	alerts := make([]Alert, 0)
	for rows.Next() {
		var a Alert
		var p time.Time
		var f *time.Time
		if err := rows.Scan(&a.POID, &a.PONumber, &a.ItemNo, &a.EventCode, &a.EventDesc, &p, &f, &a.Variance, &a.RAG); err != nil {
			continue
		}
		a.Plan = p.Format("2006-01-02")
		if f != nil {
			s := f.Format("2006-01-02")
			a.Forecast = &s
		}
		alerts = append(alerts, a)
	}

	c.JSON(http.StatusOK, gin.H{
		"summary": gin.H{
			"total_tracking": total,
			"red_events":     red,
			"yellow_events":  yellow,
			"green_events":   green,
		},
		"alerts": alerts,
	})
}
