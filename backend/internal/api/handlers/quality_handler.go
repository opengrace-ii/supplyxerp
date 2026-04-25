package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/logger"
	"supplyxerp/backend/internal/repository"
)

type QualityHandler struct {
	Pool *pgxpool.Pool
	Repo *repository.UnitOfWork
}

func (h *QualityHandler) ListChecks(c *gin.Context) {
	status := c.Query("status")
	triggerType := c.Query("trigger_type")
	supplierID := c.Query("supplier_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	query := `
		SELECT qc.*, p.name as material_name, s.name as supplier_name
		FROM quality_checks qc
		LEFT JOIN products p ON qc.material_id = p.id
		LEFT JOIN suppliers s ON qc.supplier_id = s.id
		WHERE 1=1
	`
	args := []any{}
	argIdx := 1

	if status != "" {
		query += fmt.Sprintf(" AND qc.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if triggerType != "" {
		query += fmt.Sprintf(" AND qc.trigger_type = $%d", argIdx)
		args = append(args, triggerType)
		argIdx++
	}
	if supplierID != "" {
		sid, _ := strconv.ParseInt(supplierID, 10, 64)
		query += fmt.Sprintf(" AND qc.supplier_id = $%d", argIdx)
		args = append(args, sid)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY qc.created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		logger.LogError("API", "QUALITY", "ListChecks", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch checks"})
		return
	}
	defer rows.Close()

	var results []any
	for rows.Next() {
		v, _ := rows.Values()
		colNames := rows.FieldDescriptions()
		m := make(map[string]any)
		for i, col := range colNames {
			m[string(col.Name)] = v[i]
		}
		results = append(results, m)
	}

	// Simple count summary
	var counts struct {
		Open       int `json:"open"`
		InProgress int `json:"in_progress"`
		Passed     int `json:"passed"`
		Failed     int `json:"failed"`
	}
	_ = h.Pool.QueryRow(c.Request.Context(), `
		SELECT 
			COUNT(*) FILTER (WHERE status = 'OPEN'),
			COUNT(*) FILTER (WHERE status = 'IN_PROGRESS'),
			COUNT(*) FILTER (WHERE status = 'PASSED'),
			COUNT(*) FILTER (WHERE status = 'FAILED')
		FROM quality_checks`).Scan(&counts.Open, &counts.InProgress, &counts.Passed, &counts.Failed)

	c.JSON(http.StatusOK, gin.H{
		"quality_checks": results,
		"summary":        counts,
	})
}

func (h *QualityHandler) GetCheck(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	query := `
		SELECT qc.*, p.name as material_name, s.name as supplier_name
		FROM quality_checks qc
		LEFT JOIN products p ON qc.material_id = p.id
		LEFT JOIN suppliers s ON qc.supplier_id = s.id
		WHERE qc.id = $1
	`
	rows, err := h.Pool.Query(c.Request.Context(), query, id)
	if err != nil {
		logger.LogError("API", "QUALITY", "GetCheck", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch check"})
		return
	}
	defer rows.Close()

	if !rows.Next() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Check not found"})
		return
	}

	v, _ := rows.Values()
	colNames := rows.FieldDescriptions()
	qc := make(map[string]any)
	for i, col := range colNames {
		qc[string(col.Name)] = v[i]
	}
	rows.Close()

	// Get findings
	findingsRows, _ := h.Pool.Query(c.Request.Context(), "SELECT * FROM quality_check_findings WHERE check_id = $1", id)
	defer findingsRows.Close()
	var findings []any
	for findingsRows.Next() {
		fv, _ := findingsRows.Values()
		fCols := findingsRows.FieldDescriptions()
		fm := make(map[string]any)
		for i, col := range fCols {
			fm[string(col.Name)] = fv[i]
		}
		findings = append(findings, fm)
	}

	c.JSON(http.StatusOK, gin.H{
		"quality_check": qc,
		"findings":      findings,
	})
}

func (h *QualityHandler) StartInspection(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Inspector string `json:"inspector"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE quality_checks 
		SET status = 'IN_PROGRESS', inspector = $1, inspection_date = CURRENT_DATE, updated_at = NOW() 
		WHERE id = $2 AND status = 'OPEN'`,
		req.Inspector, id)

	if err != nil {
		logger.LogError("API", "QUALITY", "StartInspection", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start inspection"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *QualityHandler) RecordResult(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		QuantityPassed  float64 `json:"quantity_passed"`
		QuantityFailed  float64 `json:"quantity_failed"`
		Result          string  `json:"result"`
		FailureCategory string  `json:"failure_category"`
		Inspector       string  `json:"inspector"`
		StorageZone     string  `json:"storage_zone"`
		QuarantineZone  string  `json:"quarantine_zone"`
		Notes           string  `json:"notes"`
		Findings        []struct {
			FindingNo        int     `json:"finding_no"`
			FindingType      string  `json:"finding_type"`
			Category         string  `json:"category"`
			Description      string  `json:"description"`
			QuantityAffected float64 `json:"quantity_affected"`
			Severity         string  `json:"severity"`
		} `json:"findings"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		logger.LogError("API", "QUALITY", "RecordResult", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var qc struct {
		CheckNumber       string
		QuantityToInspect float64
		SupplierID        *int64
	}
	err = tx.QueryRow(c.Request.Context(), "SELECT check_number, quantity_to_inspect, supplier_id FROM quality_checks WHERE id = $1", id).Scan(
		&qc.CheckNumber, &qc.QuantityToInspect, &qc.SupplierID,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Check not found"})
		return
	}

	if req.QuantityPassed+req.QuantityFailed > qc.QuantityToInspect {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Total passed + failed exceeds quantity to inspect"})
		return
	}

	status := "PARTIAL"
	if req.QuantityFailed == 0 && req.QuantityPassed == qc.QuantityToInspect {
		status = "PASSED"
	} else if req.QuantityPassed == 0 && req.QuantityFailed == qc.QuantityToInspect {
		status = "FAILED"
	}

	pending := qc.QuantityToInspect - req.QuantityPassed - req.QuantityFailed

	_, err = tx.Exec(c.Request.Context(), `
		UPDATE quality_checks 
		SET quantity_passed = $1, quantity_failed = $2, quantity_pending = $3, 
		    status = $4, result = $5, failure_category = $6, inspector = $7, 
		    storage_zone = $8, quarantine_zone = $9, notes = $10, updated_at = NOW()
		WHERE id = $11`,
		req.QuantityPassed, req.QuantityFailed, pending, status, req.Result, 
		req.FailureCategory, req.Inspector, req.StorageZone, req.QuarantineZone, req.Notes, id)

	if err != nil {
		logger.LogError("API", "QUALITY", "RecordResult", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record result"})
		return
	}

	// Upsert findings
	_, _ = tx.Exec(c.Request.Context(), "DELETE FROM quality_check_findings WHERE check_id = $1", id)
	for _, f := range req.Findings {
		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO quality_check_findings (check_id, finding_no, finding_type, category, description, quantity_affected, severity)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			id, f.FindingNo, f.FindingType, f.Category, f.Description, f.QuantityAffected, f.Severity)
		if err != nil {
			logger.LogError("API", "QUALITY", "RecordResult", "Finding insert fail: "+err.Error())
		}
	}

	// Update supplier scorecard if REJECTED
	if req.Result == "REJECT" && qc.SupplierID != nil {
		_, err = tx.Exec(c.Request.Context(), `
			UPDATE vendor_scorecards 
			SET quality_score = GREATEST(0, quality_score - 10)
			WHERE supplier_id = $1 AND period_start <= CURRENT_DATE AND period_end >= CURRENT_DATE`,
			*qc.SupplierID)
		if err != nil {
			logger.LogError("API", "QUALITY", "RecordResult", "Scorecard update fail: "+err.Error())
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	logger.LogInfo("QUALITY", "RecordResult", fmt.Sprintf("QC result: check=%s result=%s passed=%f failed=%f", qc.CheckNumber, req.Result, req.QuantityPassed, req.QuantityFailed))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *QualityHandler) AddFinding(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		FindingNo        int     `json:"finding_no"`
		FindingType      string  `json:"finding_type"`
		Category         string  `json:"category"`
		Description      string  `json:"description"`
		QuantityAffected float64 `json:"quantity_affected"`
		Severity         string  `json:"severity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO quality_check_findings (check_id, finding_no, finding_type, category, description, quantity_affected, severity)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, req.FindingNo, req.FindingType, req.Category, req.Description, req.QuantityAffected, req.Severity)

	if err != nil {
		logger.LogError("API", "QUALITY", "AddFinding", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add finding"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *QualityHandler) GetDashboard(c *gin.Context) {
	var dashboard struct {
		OpenChecks           int `json:"open_checks"`
		OverdueChecks        int `json:"overdue_checks"`
		PassedThisWeek      int `json:"passed_this_week"`
		FailedThisWeek      int `json:"failed_this_week"`
		RejectionRatePct    float64 `json:"rejection_rate_pct"`
		TopFailureCategories []any `json:"top_failure_categories"`
		SupplierQualityAlerts []any `json:"supplier_quality_alerts"`
	}
	dashboard.TopFailureCategories = []any{}
	dashboard.SupplierQualityAlerts = []any{}

	_ = h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM quality_checks WHERE status = 'OPEN'").Scan(&dashboard.OpenChecks)
	_ = h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM quality_checks WHERE status = 'OPEN' AND created_at < NOW() - INTERVAL '3 days'").Scan(&dashboard.OverdueChecks)
	_ = h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM quality_checks WHERE status = 'PASSED' AND updated_at >= NOW() - INTERVAL '7 days'").Scan(&dashboard.PassedThisWeek)
	_ = h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM quality_checks WHERE status = 'FAILED' AND updated_at >= NOW() - INTERVAL '7 days'").Scan(&dashboard.FailedThisWeek)

	totalThisWeek := dashboard.PassedThisWeek + dashboard.FailedThisWeek
	if totalThisWeek > 0 {
		dashboard.RejectionRatePct = (float64(dashboard.FailedThisWeek) / float64(totalThisWeek)) * 100
	}

	// Top failure categories
	catRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT failure_category as category, COUNT(*) as count 
		FROM quality_checks 
		WHERE failure_category IS NOT NULL 
		GROUP BY failure_category ORDER BY count DESC LIMIT 5`)
	defer catRows.Close()
	for catRows.Next() {
		var cat string
		var count int
		_ = catRows.Scan(&cat, &count)
		dashboard.TopFailureCategories = append(dashboard.TopFailureCategories, gin.H{"category": cat, "count": count})
	}

	// Supplier quality alerts
	alertRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT s.name as supplier_name, COUNT(*) as failed_count, MAX(v.quality_score) as current_score
		FROM quality_checks qc
		JOIN suppliers s ON qc.supplier_id = s.id
		LEFT JOIN vendor_scorecards v ON s.id = v.supplier_id
		WHERE qc.status = 'FAILED' AND qc.updated_at >= NOW() - INTERVAL '7 days'
		GROUP BY s.id, s.name
		HAVING COUNT(*) >= 2`)
	defer alertRows.Close()
	for alertRows.Next() {
		var name string
		var count int
		var score float64
		_ = alertRows.Scan(&name, &count, &score)
		dashboard.SupplierQualityAlerts = append(dashboard.SupplierQualityAlerts, gin.H{
			"supplier_name": name,
			"failed_count":  count,
			"current_score": score,
		})
	}

	c.JSON(http.StatusOK, dashboard)
}
