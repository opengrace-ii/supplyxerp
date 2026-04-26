package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/logger"
)

type SupplyPactsHandler struct {
	Pool *pgxpool.Pool
}

func NewSupplyPactsHandler(pool *pgxpool.Pool) *SupplyPactsHandler {
	return &SupplyPactsHandler{Pool: pool}
}

// ─────────────────────────────────────────────────────────────
// Supply Pacts
// ─────────────────────────────────────────────────────────────

// GET /api/supply-pacts
func (h *SupplyPactsHandler) ListSupplyPacts(c *gin.Context) {
	pactType := c.Query("type")
	status := c.Query("status")
	supplierID := c.Query("supplier_id")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	query := `
		SELECT p.id, p.pact_number, p.pact_type, p.supplier_id, s.name as supplier_name,
		       p.status, p.validity_start, p.validity_end, p.currency,
		       p.target_value, p.target_qty, p.target_unit,
		       p.released_value, p.released_qty, p.created_at
		FROM supply_pacts p
		JOIN suppliers s ON p.supplier_id = s.id
		WHERE 1=1`
	
	args := []interface{}{}
	argCount := 1

	// In a real app we'd filter by tenant_id if suppliers/pacts were tenant-bound
	// Assuming tenant_id filtering is needed if columns exist (migration didn't have it but others do)
	// Wait, migration 019 supply_pacts table DOES NOT have tenant_id. 
	// That's a mistake in the provided SQL if it's a multi-tenant app.
	// But I must follow the SQL provided.
	
	if pactType != "" {
		query += fmt.Sprintf(" AND p.pact_type = $%d", argCount)
		args = append(args, pactType)
		argCount++
	}
	if status != "" {
		query += fmt.Sprintf(" AND p.status = $%d", argCount)
		args = append(args, status)
		argCount++
	}
	if supplierID != "" {
		query += fmt.Sprintf(" AND p.supplier_id = $%d", argCount)
		args = append(args, supplierID)
		argCount++
	}

	query += fmt.Sprintf(" ORDER BY p.created_at DESC LIMIT $%d", argCount)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		logger.LogError("API", "COMMERCE", "ListSupplyPacts", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list supply pacts"})
		return
	}
	defer rows.Close()

	type PactRow struct {
		ID            int64     `json:"id"`
		PactNumber    string    `json:"pact_number"`
		PactType      string    `json:"pact_type"`
		SupplierID    int64     `json:"supplier_id"`
		SupplierName  string    `json:"supplier_name"`
		Status        string    `json:"status"`
		ValidityStart time.Time `json:"validity_start"`
		ValidityEnd   time.Time `json:"validity_end"`
		Currency      string    `json:"currency"`
		TargetValue   *float64  `json:"target_value"`
		TargetQty     *float64  `json:"target_qty"`
		TargetUnit    *string   `json:"target_unit"`
		ReleasedValue float64   `json:"released_value"`
		ReleasedQty   float64   `json:"released_qty"`
		CreatedAt     time.Time `json:"created_at"`
	}

	results := []PactRow{}
	for rows.Next() {
		var r PactRow
		err := rows.Scan(
			&r.ID, &r.PactNumber, &r.PactType, &r.SupplierID, &r.SupplierName,
			&r.Status, &r.ValidityStart, &r.ValidityEnd, &r.Currency,
			&r.TargetValue, &r.TargetQty, &r.TargetUnit,
			&r.ReleasedValue, &r.ReleasedQty, &r.CreatedAt,
		)
		if err != nil {
			logger.LogError("API", "COMMERCE", "ListSupplyPacts", "Scan error: "+err.Error())
			continue
		}
		results = append(results, r)
	}

	c.JSON(http.StatusOK, gin.H{"supply_pacts": results})
}

// POST /api/supply-pacts
func (h *SupplyPactsHandler) CreateSupplyPact(c *gin.Context) {
	var req struct {
		SupplierID     int64   `json:"supplier_id"`
		PactType       string  `json:"pact_type"`
		ValidityStart  string  `json:"validity_start"`
		ValidityEnd    string  `json:"validity_end"`
		Currency       string  `json:"currency"`
		TargetValue    float64 `json:"target_value"`
		TargetQty      float64 `json:"target_qty"`
		TargetUnit     string  `json:"target_unit"`
		PaymentTerms   string  `json:"payment_terms"`
		Incoterms      string  `json:"incoterms"`
		IncotermsPlace string  `json:"incoterms_place"`
		Notes          string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vStart, err1 := time.Parse("2006-01-02", req.ValidityStart)
	vEnd, err2 := time.Parse("2006-01-02", req.ValidityEnd)
	if err1 != nil || err2 != nil || !vEnd.After(vStart) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid validity dates"})
		return
	}

	// Auto-generate pact_number: PACT-{YEAR}-{5-digit-seq}
	year := time.Now().Year()
	var seq int
	err := h.Pool.QueryRow(c.Request.Context(), 
		"SELECT COALESCE(MAX(SUBSTRING(pact_number FROM 11)::int), 0) + 1 FROM supply_pacts WHERE pact_number LIKE $1",
		fmt.Sprintf("PACT-%d-%%", year)).Scan(&seq)
	if err != nil {
		seq = 1
	}
	pactNumber := fmt.Sprintf("PACT-%d-%05d", year, seq)

	actorID := c.MustGet("username").(string)

	var id int64
	err = h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO supply_pacts (
			pact_number, pact_type, supplier_id, status, validity_start, validity_end,
			currency, target_value, target_qty, target_unit, payment_terms,
			incoterms, incoterms_place, notes, created_by
		) VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id`,
		pactNumber, req.PactType, req.SupplierID, vStart, vEnd,
		req.Currency, req.TargetValue, req.TargetQty, req.TargetUnit, req.PaymentTerms,
		req.Incoterms, req.IncotermsPlace, req.Notes, actorID,
	).Scan(&id)

	if err != nil {
		logger.LogError("API", "COMMERCE", "CreateSupplyPact", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create supply pact"})
		return
	}

	logger.LogInfo("COMMERCE", "CreateSupplyPact", fmt.Sprintf("Pact created: %s", pactNumber))
	c.JSON(http.StatusCreated, gin.H{"id": id, "pact_number": pactNumber})
}

// GET /api/supply-pacts/:id
func (h *SupplyPactsHandler) GetSupplyPact(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var p struct {
		ID             int64     `json:"id"`
		PactNumber     string    `json:"pact_number"`
		PactType       string    `json:"pact_type"`
		SupplierID     int64     `json:"supplier_id"`
		SupplierName   string    `json:"supplier_name"`
		Status         string    `json:"status"`
		ValidityStart  time.Time `json:"validity_start"`
		ValidityEnd    time.Time `json:"validity_end"`
		Currency       string    `json:"currency"`
		TargetValue    *float64  `json:"target_value"`
		TargetQty      *float64  `json:"target_qty"`
		TargetUnit     *string   `json:"target_unit"`
		ReleasedValue  float64   `json:"released_value"`
		ReleasedQty    float64   `json:"released_qty"`
		PaymentTerms   string    `json:"payment_terms"`
		Incoterms      string    `json:"incoterms"`
		IncotermsPlace string    `json:"incoterms_place"`
		Notes          string    `json:"notes"`
	}

	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT p.id, p.pact_number, p.pact_type, p.supplier_id, s.name,
		       p.status, p.validity_start, p.validity_end, p.currency,
		       p.target_value, p.target_qty, p.target_unit,
		       p.released_value, p.released_qty,
		       COALESCE(p.payment_terms, ''), COALESCE(p.incoterms, ''),
		       COALESCE(p.incoterms_place, ''), COALESCE(p.notes, '')
		FROM supply_pacts p
		JOIN suppliers s ON p.supplier_id = s.id
		WHERE p.id = $1`, id).Scan(
		&p.ID, &p.PactNumber, &p.PactType, &p.SupplierID, &p.SupplierName,
		&p.Status, &p.ValidityStart, &p.ValidityEnd, &p.Currency,
		&p.TargetValue, &p.TargetQty, &p.TargetUnit,
		&p.ReleasedValue, &p.ReleasedQty,
		&p.PaymentTerms, &p.Incoterms, &p.IncotermsPlace, &p.Notes,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "pact not found"})
		} else {
			logger.LogError("API", "COMMERCE", "GetSupplyPact", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get pact"})
		}
		return
	}

	// Lines
	type Line struct {
		ID            int64    `json:"id"`
		LineNo        int      `json:"line_no"`
		MaterialID    *int64   `json:"material_id"`
		MaterialCode  *string  `json:"material_code"`
		MaterialName  *string  `json:"material_name"`
		Description   string   `json:"description"`
		TargetQty     float64  `json:"target_qty"`
		UnitOfMeasure string   `json:"unit_of_measure"`
		AgreedPrice   float64  `json:"agreed_price"`
		Currency      string   `json:"currency"`
		ReleasedQty   float64  `json:"released_qty"`
		OpenQty       float64  `json:"open_qty"`
	}
	lines := []Line{}
	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT l.id, l.line_no, l.material_id, m.public_id, m.name,
		       COALESCE(l.description, ''), l.target_qty, l.unit_of_measure,
		       l.agreed_price, l.currency, l.released_qty, l.open_qty
		FROM supply_pact_lines l
		LEFT JOIN products m ON l.material_id = m.id
		WHERE l.pact_id = $1
		ORDER BY l.line_no`, id)
	for rows.Next() {
		var l Line
		rows.Scan(&l.ID, &l.LineNo, &l.MaterialID, &l.MaterialCode, &l.MaterialName,
			&l.Description, &l.TargetQty, &l.UnitOfMeasure,
			&l.AgreedPrice, &l.Currency, &l.ReleasedQty, &l.OpenQty)
		lines = append(lines, l)
	}
	rows.Close()

	// Schedule
	type Sched struct {
		ID           int64     `json:"id"`
		LineNo       int       `json:"line_no"`
		DeliveryDate time.Time `json:"delivery_date"`
		ScheduledQty float64   `json:"scheduled_qty"`
		ReceivedQty  float64   `json:"received_qty"`
		Status       string    `json:"status"`
	}
	schedule := []Sched{}
	rows, _ = h.Pool.Query(c.Request.Context(), `
		SELECT id, line_no, delivery_date, scheduled_qty, received_qty, status
		FROM supply_pact_schedule
		WHERE pact_id = $1
		ORDER BY delivery_date, line_no`, id)
	for rows.Next() {
		var s Sched
		rows.Scan(&s.ID, &s.LineNo, &s.DeliveryDate, &s.ScheduledQty, &s.ReceivedQty, &s.Status)
		schedule = append(schedule, s)
	}
	rows.Close()

	c.JSON(http.StatusOK, gin.H{
		"supply_pact": p,
		"lines":       lines,
		"schedule":    schedule,
	})
}

// PUT /api/supply-pacts/:id/activate
func (h *SupplyPactsHandler) ActivateSupplyPact(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	res, err := h.Pool.Exec(c.Request.Context(), 
		"UPDATE supply_pacts SET status = 'ACTIVE' WHERE id = $1 AND status = 'DRAFT'", id)
	if err != nil {
		logger.LogError("API", "COMMERCE", "ActivateSupplyPact", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to activate pact"})
		return
	}

	if res.RowsAffected() == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pact not found or not in DRAFT status"})
		return
	}

	logger.LogInfo("COMMERCE", "ActivateSupplyPact", fmt.Sprintf("Pact %d activated", id))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// PUT /api/supply-pacts/:id/lines
func (h *SupplyPactsHandler) UpdateSupplyPactLines(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		Lines []struct {
			LineNo        int     `json:"line_no"`
			MaterialID    int64   `json:"material_id"`
			Description   string  `json:"description"`
			TargetQty     float64 `json:"target_qty"`
			UnitOfMeasure string  `json:"unit_of_measure"`
			AgreedPrice   float64 `json:"agreed_price"`
			Currency      string  `json:"currency"`
		} `json:"lines"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tx error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	_, err = tx.Exec(c.Request.Context(), "DELETE FROM supply_pact_lines WHERE pact_id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete lines error"})
		return
	}

	for _, l := range req.Lines {
		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO supply_pact_lines (
				pact_id, line_no, material_id, description, target_qty, unit_of_measure,
				agreed_price, currency
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			id, l.LineNo, l.MaterialID, l.Description, l.TargetQty, l.UnitOfMeasure,
			l.AgreedPrice, l.Currency)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "insert line error"})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "commit error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// POST /api/supply-pacts/:id/releases
func (h *SupplyPactsHandler) CreatePactRelease(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		PactLineNo    int     `json:"pact_line_no"`
		POID          int64   `json:"po_id"`
		ReleasedQty   float64 `json:"released_qty"`
		ReleasedValue float64 `json:"released_value"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actorID := c.MustGet("username").(string)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tx error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	_, err = tx.Exec(c.Request.Context(), `
		INSERT INTO supply_pact_releases (
			pact_id, pact_line_no, po_id, released_qty, released_value, created_by
		) VALUES ($1, $2, $3, $4, $5, $6)`,
		id, req.PactLineNo, req.POID, req.ReleasedQty, req.ReleasedValue, actorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "insert release error"})
		return
	}

	_, err = tx.Exec(c.Request.Context(), `
		UPDATE supply_pact_lines SET released_qty = released_qty + $1
		WHERE pact_id = $2 AND line_no = $3`, req.ReleasedQty, id, req.PactLineNo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update line error"})
		return
	}

	_, err = tx.Exec(c.Request.Context(), `
		UPDATE supply_pacts SET 
			released_qty = released_qty + $1,
			released_value = released_value + $2
		WHERE id = $3`, req.ReleasedQty, req.ReleasedValue, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update pact error"})
		return
	}

	// Check if fulfilled (simplified: if any line reaches target_qty)
	// The prompt says "If released_qty >= target_qty: set status = FULFILLED." on the pact.
	// But pacts can have target_qty OR target_value.
	_, err = tx.Exec(c.Request.Context(), `
		UPDATE supply_pacts SET status = 'FULFILLED'
		WHERE id = $1 AND (
			(target_qty IS NOT NULL AND target_qty > 0 AND released_qty >= target_qty) OR
			(target_value IS NOT NULL AND target_value > 0 AND released_value >= target_value)
		)`, id)

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "commit error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true})
}

// GET /api/supply-pacts/:id/releases
func (h *SupplyPactsHandler) ListPactReleases(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT r.id, r.pact_line_no, r.po_id, po.po_number,
		       r.released_qty, r.released_value, r.release_date, r.created_by
		FROM supply_pact_releases r
		JOIN purchase_orders po ON r.po_id = po.id
		WHERE r.pact_id = $1
		ORDER BY r.release_date DESC`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Release struct {
		ID            int64     `json:"id"`
		PactLineNo    int       `json:"pact_line_no"`
		POID          int64     `json:"po_id"`
		PONumber      string    `json:"po_number"`
		ReleasedQty   float64   `json:"released_qty"`
		ReleasedValue float64   `json:"released_value"`
		ReleaseDate   time.Time `json:"release_date"`
		CreatedBy     string    `json:"created_by"`
	}

	results := []Release{}
	for rows.Next() {
		var r Release
		rows.Scan(&r.ID, &r.PactLineNo, &r.POID, &r.PONumber, &r.ReleasedQty, &r.ReleasedValue, &r.ReleaseDate, &r.CreatedBy)
		results = append(results, r)
	}

	c.JSON(http.StatusOK, gin.H{"releases": results})
}

// ─────────────────────────────────────────────────────────────
// Vendor Scorecard
// ─────────────────────────────────────────────────────────────

// GET /api/vendors/:id/scorecard
func (h *SupplyPactsHandler) GetVendorScorecards(c *gin.Context) {
	supplierID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, period_start, period_end, price_score, delivery_score,
		       quality_score, response_score, overall_score,
		       price_notes, delivery_notes, quality_notes, response_notes,
		       evaluated_by, auto_calculated, created_at
		FROM vendor_scorecards
		WHERE supplier_id = $1
		ORDER BY period_start DESC`, supplierID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Scorecard struct {
		ID             int64     `json:"id"`
		PeriodStart    time.Time `json:"period_start"`
		PeriodEnd      time.Time `json:"period_end"`
		PriceScore     float64   `json:"price_score"`
		DeliveryScore  float64   `json:"delivery_score"`
		QualityScore   float64   `json:"quality_score"`
		ResponseScore  float64   `json:"response_score"`
		OverallScore   float64   `json:"overall_score"`
		PriceNotes     string    `json:"price_notes"`
		DeliveryNotes  string    `json:"delivery_notes"`
		QualityNotes   string    `json:"quality_notes"`
		ResponseNotes  string    `json:"response_notes"`
		EvaluatedBy    string    `json:"evaluated_by"`
		AutoCalculated bool      `json:"auto_calculated"`
		CreatedAt      time.Time `json:"created_at"`
	}

	results := []Scorecard{}
	for rows.Next() {
		var s Scorecard
		rows.Scan(&s.ID, &s.PeriodStart, &s.PeriodEnd, &s.PriceScore, &s.DeliveryScore,
			&s.QualityScore, &s.ResponseScore, &s.OverallScore,
			&s.PriceNotes, &s.DeliveryNotes, &s.QualityNotes, &s.ResponseNotes,
			&s.EvaluatedBy, &s.AutoCalculated, &s.CreatedAt)
		results = append(results, s)
	}

	c.JSON(http.StatusOK, gin.H{"scorecards": results})
}

// POST /api/vendors/:id/scorecard
func (h *SupplyPactsHandler) CreateVendorScorecard(c *gin.Context) {
	supplierID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		PeriodStart   string  `json:"period_start"`
		PeriodEnd     string  `json:"period_end"`
		PriceScore    float64 `json:"price_score"`
		DeliveryScore float64 `json:"delivery_score"`
		QualityScore  float64 `json:"quality_score"`
		ResponseScore float64 `json:"response_score"`
		PriceNotes    string  `json:"price_notes"`
		DeliveryNotes string  `json:"delivery_notes"`
		QualityNotes  string  `json:"quality_notes"`
		ResponseNotes string  `json:"response_notes"`
		EvaluatedBy   string  `json:"evaluated_by"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pStart, _ := time.Parse("2006-01-02", req.PeriodStart)
	pEnd, _   := time.Parse("2006-01-02", req.PeriodEnd)

	// Validate scores 0-100
	if req.PriceScore < 0 || req.PriceScore > 100 ||
	   req.DeliveryScore < 0 || req.DeliveryScore > 100 ||
	   req.QualityScore < 0 || req.QualityScore > 100 ||
	   req.ResponseScore < 0 || req.ResponseScore > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "scores must be 0-100"})
		return
	}

	_, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO vendor_scorecards (
			supplier_id, period_start, period_end, price_score, delivery_score,
			quality_score, response_score, price_notes, delivery_notes,
			quality_notes, response_notes, evaluated_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		supplierID, pStart, pEnd, req.PriceScore, req.DeliveryScore,
		req.QualityScore, req.ResponseScore, req.PriceNotes, req.DeliveryNotes,
		req.QualityNotes, req.ResponseNotes, req.EvaluatedBy)

	if err != nil {
		logger.LogError("API", "COMMERCE", "CreateVendorScorecard", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create scorecard"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true})
}

// GET /api/vendors/scorecard-summary
func (h *SupplyPactsHandler) GetScorecardSummary(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `
		WITH LatestPeriod AS (
			SELECT MAX(period_end) as max_end FROM vendor_scorecards
		)
		SELECT RANK() OVER(ORDER BY overall_score DESC) as rank,
		       s.name as supplier_name, v.overall_score,
		       v.price_score, v.delivery_score, v.quality_score, v.response_score,
		       v.period_start, v.period_end
		FROM vendor_scorecards v
		JOIN suppliers s ON v.supplier_id = s.id
		JOIN LatestPeriod lp ON v.period_end = lp.max_end
		ORDER BY rank ASC
		LIMIT 10`)
	
	if err != nil {
		logger.LogError("API", "COMMERCE", "GetScorecardSummary", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Ranking struct {
		Rank          int       `json:"rank"`
		SupplierName  string    `json:"supplier_name"`
		OverallScore  float64   `json:"overall_score"`
		PriceScore    float64   `json:"price_score"`
		DeliveryScore float64   `json:"delivery_score"`
		QualityScore  float64   `json:"quality_score"`
		ResponseScore float64   `json:"response_score"`
		Period        string    `json:"period"`
	}

	results := []Ranking{}
	for rows.Next() {
		var r Ranking
		var pStart, pEnd time.Time
		rows.Scan(&r.Rank, &r.SupplierName, &r.OverallScore,
			&r.PriceScore, &r.DeliveryScore, &r.QualityScore, &r.ResponseScore,
			&pStart, &pEnd)
		
		r.Period = fmt.Sprintf("%s - %s", pStart.Format("Jan 2006"), pEnd.Format("Jan 2006"))
		results = append(results, r)
	}

	c.JSON(http.StatusOK, gin.H{"rankings": results})
}

// ─────────────────────────────────────────────────────────────
// Price Formulas
// ─────────────────────────────────────────────────────────────

// GET /api/price-formulas
func (h *SupplyPactsHandler) ListPriceFormulas(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, name, description, is_default, is_active
		FROM price_formulas
		WHERE is_active = true`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Formula struct {
		ID          int64  `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		IsDefault   bool   `json:"is_default"`
		IsActive    bool   `json:"is_active"`
		Rules       []interface{} `json:"rules,omitempty"`
	}

	results := []Formula{}
	for rows.Next() {
		var f Formula
		rows.Scan(&f.ID, &f.Name, &f.Description, &f.IsDefault, &f.IsActive)
		results = append(results, f)
	}

	c.JSON(http.StatusOK, results)
}

// GET /api/price-formulas/:id
func (h *SupplyPactsHandler) GetPriceFormula(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var f struct {
		ID          int64  `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		IsDefault   bool   `json:"is_default"`
		IsActive    bool   `json:"is_active"`
	}

	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT id, name, description, is_default, is_active
		FROM price_formulas
		WHERE id = $1`, id).Scan(&f.ID, &f.Name, &f.Description, &f.IsDefault, &f.IsActive)
	
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "formula not found"})
		return
	}

	type Rule struct {
		ID           int64  `json:"id"`
		Sequence     int    `json:"sequence"`
		RuleName     string `json:"rule_name"`
		RuleType     string `json:"rule_type"`
		CalcMethod   string `json:"calc_method"`
		Sign         string `json:"sign"`
		IsMandatory  bool   `json:"is_mandatory"`
		IsStatistical bool   `json:"is_statistical"`
		FromStep     *int   `json:"from_step"`
	}

	rules := []Rule{}
	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT id, sequence, rule_name, rule_type, calc_method, sign,
		       is_mandatory, is_statistical, from_step
		FROM price_rules
		WHERE formula_id = $1
		ORDER BY sequence`, id)
	for rows.Next() {
		var r Rule
		rows.Scan(&r.ID, &r.Sequence, &r.RuleName, &r.RuleType, &r.CalcMethod, &r.Sign,
			&r.IsMandatory, &r.IsStatistical, &r.FromStep)
		rules = append(rules, r)
	}
	rows.Close()

	c.JSON(http.StatusOK, gin.H{
		"formula": f,
		"rules":   rules,
	})
}

// PUT /api/price-formulas/:id/rules
func (h *SupplyPactsHandler) UpdatePriceFormulaRules(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		Rules []struct {
			Sequence      int    `json:"sequence"`
			RuleName      string `json:"rule_name"`
			RuleType      string `json:"rule_type"`
			CalcMethod    string `json:"calc_method"`
			Sign          string `json:"sign"`
			IsMandatory   bool   `json:"is_mandatory"`
			IsStatistical bool   `json:"is_statistical"`
			FromStep      *int   `json:"from_step"`
		} `json:"rules"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tx error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	_, err = tx.Exec(c.Request.Context(), "DELETE FROM price_rules WHERE formula_id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete rules error"})
		return
	}

	for _, r := range req.Rules {
		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO price_rules (
				formula_id, sequence, rule_name, rule_type, calc_method, sign,
				is_mandatory, is_statistical, from_step
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			id, r.Sequence, r.RuleName, r.RuleType, r.CalcMethod, r.Sign,
			r.IsMandatory, r.IsStatistical, r.FromStep)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "insert rule error"})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "commit error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// POST /api/price-formulas/:id/rules/:rule_id/records
func (h *SupplyPactsHandler) CreatePriceRuleRecord(c *gin.Context) {
	ruleID, _ := strconv.ParseInt(c.Param("rule_id"), 10, 64)

	var req struct {
		SupplierID    *int64  `json:"supplier_id"`
		MaterialID    *int64  `json:"material_id"`
		ValidFrom     string  `json:"valid_from"`
		ValidTo       *string `json:"valid_to"`
		Amount        float64 `json:"amount"`
		Currency      string  `json:"currency"`
		PerQty        float64 `json:"per_qty"`
		UnitOfMeasure string  `json:"unit_of_measure"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vFrom, _ := time.Parse("2006-01-02", req.ValidFrom)
	var vTo *time.Time
	if req.ValidTo != nil && *req.ValidTo != "" {
		t, _ := time.Parse("2006-01-02", *req.ValidTo)
		vTo = &t
	}

	if req.PerQty == 0 { req.PerQty = 1 }

	_, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO price_rule_records (
			rule_id, supplier_id, material_id, valid_from, valid_to,
			amount, currency, per_qty, unit_of_measure
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		ruleID, req.SupplierID, req.MaterialID, vFrom, vTo,
		req.Amount, req.Currency, req.PerQty, req.UnitOfMeasure)
	
	if err != nil {
		logger.LogError("API", "CONFIG", "CreatePriceRuleRecord", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create record"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true})
}

// POST /api/price-formulas/calculate
func (h *SupplyPactsHandler) CalculatePrice(c *gin.Context) {
	var req struct {
		FormulaID  int64   `json:"formula_id"`
		SupplierID int64   `json:"supplier_id"`
		MaterialID int64   `json:"material_id"`
		Quantity   float64 `json:"quantity"`
		BasePrice  float64 `json:"base_price"`
		CostPrice  float64 `json:"cost_price"`
		Date       string  `json:"date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.BasePrice == 0 && req.CostPrice != 0 {
		req.BasePrice = req.CostPrice
	}

	calcDate, err := time.Parse("2006-01-02", req.Date)
	if err != nil { calcDate = time.Now() }

	// 1. Get rules
	type Rule struct {
		ID           int64
		Sequence     int
		RuleName     string
		RuleType     string
		CalcMethod   string
		Sign         string
		FromStep     *int
		IsStatistical bool
	}
	rules := []Rule{}
	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT id, sequence, rule_name, rule_type, calc_method, sign, from_step, is_statistical
		FROM price_rules WHERE formula_id = $1 ORDER BY sequence`, req.FormulaID)
	for rows.Next() {
		var r Rule
		rows.Scan(&r.ID, &r.Sequence, &r.RuleName, &r.RuleType, &r.CalcMethod, &r.Sign, &r.FromStep, &r.IsStatistical)
		rules = append(rules, r)
	}
	rows.Close()

	// 2. Process steps
	type Step struct {
		Sequence int     `json:"sequence"`
		RuleName string  `json:"rule_name"`
		Amount   float64 `json:"amount"`
		Subtotal float64 `json:"subtotal"`
	}

	steps := []Step{}
	runningSubtotal := 0.0
	subtotalsBySeq := make(map[int]float64)

	for _, r := range rules {
		stepAmount := 0.0

		if r.RuleType == "BASE" {
			stepAmount = req.BasePrice
			if r.CalcMethod == "QTY" {
				stepAmount = req.BasePrice * req.Quantity
			}
			runningSubtotal = stepAmount
		} else if r.RuleType == "SUBTOTAL" {
			stepAmount = 0
			// runningSubtotal stays same
		} else {
			// Find record
			var recordAmount float64
			err := h.Pool.QueryRow(c.Request.Context(), `
				SELECT amount FROM price_rule_records
				WHERE rule_id = $1 
				AND (supplier_id = $2 OR supplier_id IS NULL)
				AND (material_id = $3 OR material_id IS NULL)
				AND valid_from <= $4 AND (valid_to >= $4 OR valid_to IS NULL)
				ORDER BY supplier_id NULLS LAST, material_id NULLS LAST
				LIMIT 1`, r.ID, req.SupplierID, req.MaterialID, calcDate).Scan(&recordAmount)
			
			if err == nil {
				refValue := runningSubtotal
				if r.FromStep != nil {
					refValue = subtotalsBySeq[*r.FromStep]
				}

				if r.CalcMethod == "PCT" {
					stepAmount = refValue * (recordAmount / 100.0)
				} else if r.CalcMethod == "FIXED" {
					stepAmount = recordAmount
				} else if r.CalcMethod == "QTY" {
					stepAmount = recordAmount * req.Quantity
				}

				if r.Sign == "-" {
					stepAmount = -stepAmount
				}

				if !r.IsStatistical {
					runningSubtotal += stepAmount
				}
			}
		}

		subtotalsBySeq[r.Sequence] = runningSubtotal
		steps = append(steps, Step{
			Sequence: r.Sequence,
			RuleName: r.RuleName,
			Amount:   stepAmount,
			Subtotal: runningSubtotal,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"steps":       steps,
		"final_price": runningSubtotal,
		"currency":    "USD", // default
	})
}

// ─────────────────────────────────────────────────────────────
// Document Dispatch
// ─────────────────────────────────────────────────────────────

// GET /api/dispatch/rules
func (h *SupplyPactsHandler) GetDispatchRules(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, document_type, trigger_event, dispatch_method, supplier_id, is_active
		FROM dispatch_rules`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Rule struct {
		ID             int64   `json:"id"`
		DocumentType   string  `json:"document_type"`
		TriggerEvent   string  `json:"trigger_event"`
		DispatchMethod string  `json:"dispatch_method"`
		SupplierID     *int64  `json:"supplier_id"`
		IsActive       bool    `json:"is_active"`
	}

	results := []Rule{}
	for rows.Next() {
		var r Rule
		rows.Scan(&r.ID, &r.DocumentType, &r.TriggerEvent, &r.DispatchMethod, &r.SupplierID, &r.IsActive)
		results = append(results, r)
	}

	c.JSON(http.StatusOK, results)
}

// PUT /api/dispatch/rules
func (h *SupplyPactsHandler) UpdateDispatchRules(c *gin.Context) {
	var req struct {
		Rules []struct {
			ID             int64   `json:"id"`
			DocumentType   string  `json:"document_type"`
			TriggerEvent   string  `json:"trigger_event"`
			DispatchMethod string  `json:"dispatch_method"`
			SupplierID     *int64  `json:"supplier_id"`
			IsActive       bool    `json:"is_active"`
		} `json:"rules"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tx error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	for _, r := range req.Rules {
		if r.ID > 0 {
			_, err = tx.Exec(c.Request.Context(), `
				UPDATE dispatch_rules SET
					document_type = $1, trigger_event = $2, dispatch_method = $3,
					supplier_id = $4, is_active = $5
				WHERE id = $6`,
				r.DocumentType, r.TriggerEvent, r.DispatchMethod, r.SupplierID, r.IsActive, r.ID)
		} else {
			_, err = tx.Exec(c.Request.Context(), `
				INSERT INTO dispatch_rules (
					document_type, trigger_event, dispatch_method, supplier_id, is_active
				) VALUES ($1, $2, $3, $4, $5)`,
				r.DocumentType, r.TriggerEvent, r.DispatchMethod, r.SupplierID, r.IsActive)
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "upsert rule error"})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "commit error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// POST /api/dispatch/send
func (h *SupplyPactsHandler) SendDocument(c *gin.Context) {
	var req struct {
		DocumentType   string `json:"document_type"`
		DocumentID     int64  `json:"document_id"`
		DispatchMethod string `json:"dispatch_method"`
		Recipient      string `json:"recipient"`
		Subject        string `json:"subject"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var id int64
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO document_dispatches (
			document_type, document_id, dispatch_method, recipient, subject, status, sent_at
		) VALUES ($1, $2, $3, $4, $5, 'SENT', now())
		RETURNING id`,
		req.DocumentType, req.DocumentID, req.DispatchMethod, req.Recipient, req.Subject,
	).Scan(&id)

	if err != nil {
		logger.LogError("API", "COMMERCE", "SendDocument", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record dispatch"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "status": "SENT"})
}

// GET /api/dispatch/log
func (h *SupplyPactsHandler) GetDispatchLog(c *gin.Context) {
	docType := c.Query("document_type")
	status := c.Query("status")
	limitStr := c.DefaultQuery("limit", "100")
	limit, _ := strconv.Atoi(limitStr)

	query := `
		SELECT d.id, d.document_type, d.document_id, d.supplier_id, s.name as supplier_name,
		       d.dispatch_method, d.status, d.sent_at, d.acknowledged_at,
		       d.recipient, d.subject, d.error_message, d.retry_count, d.created_at
		FROM document_dispatches d
		LEFT JOIN suppliers s ON d.supplier_id = s.id
		WHERE 1=1`
	
	args := []interface{}{}
	argCount := 1

	if docType != "" {
		query += fmt.Sprintf(" AND d.document_type = $%d", argCount)
		args = append(args, docType)
		argCount++
	}
	if status != "" {
		query += fmt.Sprintf(" AND d.status = $%d", argCount)
		args = append(args, status)
		argCount++
	}

	query += fmt.Sprintf(" ORDER BY d.created_at DESC LIMIT $%d", argCount)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type LogEntry struct {
		ID             int64      `json:"id"`
		DocumentType   string     `json:"document_type"`
		DocumentID     int64      `json:"document_id"`
		SupplierID     *int64     `json:"supplier_id"`
		SupplierName   *string    `json:"supplier_name"`
		DispatchMethod string     `json:"dispatch_method"`
		Status         string     `json:"status"`
		SentAt         *time.Time `json:"sent_at"`
		AcknowledgedAt *time.Time `json:"acknowledged_at"`
		Recipient      string     `json:"recipient"`
		Subject        string     `json:"subject"`
		ErrorMessage   *string    `json:"error_message"`
		RetryCount     int        `json:"retry_count"`
		CreatedAt      time.Time  `json:"created_at"`
	}

	results := []LogEntry{}
	for rows.Next() {
		var e LogEntry
		rows.Scan(&e.ID, &e.DocumentType, &e.DocumentID, &e.SupplierID, &e.SupplierName,
			&e.DispatchMethod, &e.Status, &e.SentAt, &e.AcknowledgedAt,
			&e.Recipient, &e.Subject, &e.ErrorMessage, &e.RetryCount, &e.CreatedAt)
		results = append(results, e)
	}

	c.JSON(http.StatusOK, results)
}
