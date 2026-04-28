package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/db/dbgen"
	"supplyxerp/backend/internal/repository"
)

type QualityHandler struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
	Repo    *repository.UnitOfWork
}

func NewQualityHandler(pool *pgxpool.Pool, repo *repository.UnitOfWork) *QualityHandler {
	return &QualityHandler{
		pool:    pool,
		queries: dbgen.New(pool),
		Repo:    repo,
	}
}

// GET /api/quality-checks/dashboard
func (h *QualityHandler) GetDashboard(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)

	stats, err := h.queries.GetQualityGateDashboard(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch dashboard stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GET /api/quality-checks
func (h *QualityHandler) ListChecks(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	checks, err := h.queries.ListQualityChecks(c.Request.Context(), dbgen.ListQualityChecksParams{
		TenantID: tenantID,
		Limit:    int32(limit),
		Offset:   int32(offset),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list quality checks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"quality_checks": checks})
}

// GET /api/quality-checks/:id
func (h *QualityHandler) GetCheck(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	publicIDStr := c.Param("id")

	uid, err := uuid.Parse(publicIDStr)
	if err != nil {
		// Try parsing as numeric ID if UUID fails (for backward compatibility if needed)
		id, err2 := strconv.ParseInt(publicIDStr, 10, 64)
		if err2 != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ID format"})
			return
		}
		// Fallback to query by ID if needed, but our sqlc query is by PublicID.
		// For end-to-end spec, we use PublicID.
		_ = id
	}

	check, err := h.queries.GetQualityCheckByPublicID(c.Request.Context(), dbgen.GetQualityCheckByPublicIDParams{
		PublicID: uid,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "quality check not found"})
		return
	}

	findings, _ := h.queries.GetQCFindings(c.Request.Context(), check.ID)

	c.JSON(http.StatusOK, gin.H{
		"quality_check": check,
		"findings":      findings,
	})
}

// POST /api/quality-checks/:id/start
func (h *QualityHandler) StartInspection(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	check, err := h.queries.StartQualityCheck(c.Request.Context(), dbgen.StartQualityCheckParams{
		ID:          id,
		InspectorID: pgtype.Int8{Int64: userID, Valid: true},
		TenantID:    tenantID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start inspection"})
		return
	}

	c.JSON(http.StatusOK, check)
}

// POST /api/quality-checks/:id/record-result
func (h *QualityHandler) RecordResult(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		Status       string  `json:"status"` // PASSED, FAILED, CONDITIONAL
		Result       string  `json:"result"` // ACCEPT, REJECT, CONDITIONAL
		PassedQty    float64 `json:"passed_qty"`
		FailedQty    float64 `json:"failed_qty"`
		Notes        string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to start transaction"})
		return
	}
	defer tx.Rollback(context.Background())

	qtx := h.queries.WithTx(tx)

	check, err := qtx.RecordQCResult(c.Request.Context(), dbgen.RecordQCResultParams{
		ID:       id,
		Status:   req.Status,
		Result:   pgtype.Text{String: req.Result, Valid: true},
		PassedQty: numericFromFloat(req.PassedQty),
		FailedQty: numericFromFloat(req.FailedQty),
		Notes:    pgtype.Text{String: req.Notes, Valid: true},
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record result"})
		return
	}

	// Integration: Record Scorecard Event
	if req.Result == "REJECT" || req.Result == "CONDITIONAL" {
		eventType := "QUALITY_FAIL"
		if req.Result == "CONDITIONAL" {
			eventType = "QUALITY_PARTIAL"
		}

		_, _ = qtx.RecordScorecardEvent(c.Request.Context(), dbgen.RecordScorecardEventParams{
			TenantID:      tenantID,
			SupplierID:    check.SupplierID.Int64,
			EventType:     eventType,
			ReferenceType: pgtype.Text{String: "QUALITY_CHECK", Valid: true},
			ReferenceID:   pgtype.Int8{Int64: check.ID, Valid: true},
			ReferenceCode: pgtype.Text{String: check.QcNumber, Valid: true},
			ScoreImpact:   numericFromFloat(-10.0),
			Notes:         pgtype.Text{String: "Automatic quality failure event", Valid: true},
			RecordedBy:    pgtype.Int8{Int64: userID, Valid: true},
		})

		go TriggerDispatch(c, h.queries, tenantID, "QUALITY_FAILED",
			"QUALITY_CHECK", check.ID, check.QcNumber,
			DispatchContext{
				"qc_number":     check.QcNumber,
				"material_code": "MATERIAL",
				"supplier_name": "SUPPLIER",
				"failed_qty":    "Failed quantity",
			})
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit transaction"})
		return
	}

	// Audit
	h.Repo.Audit.Log(c.Request.Context(), tenantID, userID, "QC_RESULT_RECORDED", "quality_check", strconv.FormatInt(check.ID, 10), nil, req)

	c.JSON(http.StatusOK, check)
}

// POST /api/quality-checks/:id/findings
func (h *QualityHandler) AddFinding(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		FindingType      string  `json:"finding_type"`
		Severity         string  `json:"severity"`
		Description      string  `json:"description"`
		QuantityAffected float64 `json:"quantity_affected"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	finding, err := h.queries.AddQCFinding(c.Request.Context(), dbgen.AddQCFindingParams{
		QualityCheckID:   id,
		FindingType:      req.FindingType,
		Severity:         req.Severity,
		Description:      req.Description,
		QuantityAffected: numericFromFloat(req.QuantityAffected),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add finding"})
		return
	}

	c.JSON(http.StatusOK, finding)
}
