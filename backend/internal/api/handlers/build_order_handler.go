package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"supplyxerp/backend/internal/db/dbgen"
)

type BuildOrderHandler struct {
	queries *dbgen.Queries
}

func NewBuildOrderHandler(q *dbgen.Queries) *BuildOrderHandler {
	return &BuildOrderHandler{queries: q}
}

func (h *BuildOrderHandler) GetDashboard(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	dash, err := h.queries.GetBuildOrderDashboard(c, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": dash})
}

func (h *BuildOrderHandler) ListBuildOrders(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	limit := int32(50)
	offset := int32(0)
	if l, err := strconv.Atoi(c.Query("limit")); err == nil {
		limit = int32(l)
	}
	if p, err := strconv.Atoi(c.Query("page")); err == nil {
		offset = int32(p) * limit
	}

	orders, err := h.queries.ListBuildOrders(c, dbgen.ListBuildOrdersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": orders})
}

func (h *BuildOrderHandler) CreateBuildOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)

	var req struct {
		OutputMaterialID int64   `json:"output_material_id" binding:"required"`
		BOMID            *int64  `json:"bom_id"`
		PlannedQty       float64 `json:"planned_qty"        binding:"required,gt=0"`
		UnitOfMeasure    string  `json:"unit_of_measure"`
		PlannedStart     string  `json:"planned_start"`
		PlannedFinish    string  `json:"planned_finish"`
		Priority         string  `json:"priority"`
		Notes            string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	uom := req.UnitOfMeasure
	if uom == "" {
		uom = "EA"
	}
	priority := req.Priority
	if priority == "" {
		priority = "NORMAL"
	}

	// Auto-find BOM if not provided
	var bomID pgtype.Int8
	if req.BOMID != nil {
		bomID = pgtype.Int8{Int64: *req.BOMID, Valid: true}
	} else {
		bom, err := h.queries.GetBOMByOutputMaterial(c,
			dbgen.GetBOMByOutputMaterialParams{
				TenantID:         tenantID,
				OutputMaterialID: req.OutputMaterialID,
			})
		if err == nil {
			bomID = pgtype.Int8{Int64: bom.ID, Valid: true}
		}
	}

	var pStart pgtype.Date
	if req.PlannedStart != "" {
		if t, err := time.Parse("2006-01-02", req.PlannedStart); err == nil {
			pStart = pgtype.Date{Time: t, Valid: true}
		}
	}

	var pFinish pgtype.Date
	if req.PlannedFinish != "" {
		if t, err := time.Parse("2006-01-02", req.PlannedFinish); err == nil {
			pFinish = pgtype.Date{Time: t, Valid: true}
		}
	}

	bo, err := h.queries.CreateBuildOrder(c, dbgen.CreateBuildOrderParams{
		TenantID:         tenantID,
		OutputMaterialID: req.OutputMaterialID,
		BomID:            bomID,
		PlannedQty:       numericFromFloat(req.PlannedQty),
		UnitOfMeasure:    uom,
		PlannedStart:     pStart,
		PlannedFinish:    pFinish,
		Priority:         stringToText(priority),
		Notes:            stringToText(req.Notes),
		CreatedBy:        int64ToInt8(userID),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    bo,
		"message": "Build order " + bo.BoNumber + " created",
	})
}

func (h *BuildOrderHandler) GetBuildOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id format"})
		return
	}

	bo, err := h.queries.GetBuildOrderByPublicID(c,
		dbgen.GetBuildOrderByPublicIDParams{
			PublicID: publicID,
			TenantID: tenantID,
		})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "build order not found"})
		return
	}

	issues, _ := h.queries.GetBuildOrderIssues(c, bo.ID)

	// If BOM linked, get BOM lines
	var bomLines []dbgen.GetBOMLinesRow
	if bo.BomID.Valid {
		bomLines, _ = h.queries.GetBOMLines(c, bo.BomID.Int64)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      bo,
		"issues":    issues,
		"bom_lines": bomLines,
	})
}

func (h *BuildOrderHandler) ReleaseBuildOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id format"})
		return
	}

	bo, err := h.queries.GetBuildOrderByPublicID(c,
		dbgen.GetBuildOrderByPublicIDParams{PublicID: publicID, TenantID: tenantID})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "build order not found"})
		return
	}
	if bo.Status != "DRAFT" {
		c.JSON(http.StatusConflict,
			gin.H{"error": "only DRAFT orders can be released"})
		return
	}

	released, err := h.queries.ReleaseBuildOrder(c, dbgen.ReleaseBuildOrderParams{
		ID:       bo.ID,
		ReleasedBy:  int64ToInt8(userID),
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    released,
		"message": released.BoNumber + " released to production",
	})
}

func (h *BuildOrderHandler) StartBuildOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id format"})
		return
	}

	bo, err := h.queries.GetBuildOrderByPublicID(c,
		dbgen.GetBuildOrderByPublicIDParams{PublicID: publicID, TenantID: tenantID})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "build order not found"})
		return
	}

	started, err := h.queries.StartBuildOrder(c, dbgen.StartBuildOrderParams{
		ID:       bo.ID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusConflict,
			gin.H{"error": "cannot start — status: " + bo.Status})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    started,
		"message": started.BoNumber + " production started",
	})
}

func (h *BuildOrderHandler) CompleteBuildOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id format"})
		return
	}

	var req struct {
		ActualQty float64 `json:"actual_qty" binding:"required,gt=0"`
		Notes     string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bo, err := h.queries.GetBuildOrderByPublicID(c,
		dbgen.GetBuildOrderByPublicIDParams{PublicID: publicID, TenantID: tenantID})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "build order not found"})
		return
	}

	completed, err := h.queries.CompleteBuildOrder(c,
		dbgen.CompleteBuildOrderParams{
			ID:       bo.ID,
			ActualQty:  numericFromFloat(req.ActualQty),
			CompletedBy:  int64ToInt8(userID),
			TenantID: tenantID,
		})
	if err != nil {
		c.JSON(http.StatusConflict,
			gin.H{"error": "cannot complete — status: " + bo.Status})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    completed,
		"message": completed.BoNumber + " completed — " +
			strconv.FormatFloat(req.ActualQty, 'f', 2, 64) +
			" " + completed.UnitOfMeasure + " produced",
	})
}

func (h *BuildOrderHandler) IssueComponents(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id format"})
		return
	}

	var req struct {
		MaterialID    int64   `json:"material_id"    binding:"required"`
		IssuedQty     float64 `json:"issued_qty"     binding:"required,gt=0"`
		UnitOfMeasure string  `json:"unit_of_measure"`
		Notes         string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bo, err := h.queries.GetBuildOrderByPublicID(c,
		dbgen.GetBuildOrderByPublicIDParams{PublicID: publicID, TenantID: tenantID})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "build order not found"})
		return
	}
	if bo.Status != "IN_PROGRESS" {
		c.JSON(http.StatusConflict,
			gin.H{"error": "can only issue components to IN_PROGRESS orders"})
		return
	}

	uom := req.UnitOfMeasure
	if uom == "" {
		uom = "EA"
	}

	issue, err := h.queries.IssueComponentToBuildOrder(c,
		dbgen.IssueComponentToBuildOrderParams{
			BuildOrderID:  bo.ID,
			MaterialID:    req.MaterialID,
			IssuedQty:     numericFromFloat(req.IssuedQty),
			UnitOfMeasure: uom,
			IssuedBy:      int64ToInt8(userID),
			Notes:         stringToText(req.Notes),
		})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    issue,
		"message": "Components issued to " + bo.BoNumber,
	})
}

func (h *BuildOrderHandler) CancelBuildOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id format"})
		return
	}

	bo, err := h.queries.GetBuildOrderByPublicID(c,
		dbgen.GetBuildOrderByPublicIDParams{PublicID: publicID, TenantID: tenantID})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "build order not found"})
		return
	}

	cancelled, err := h.queries.CancelBuildOrder(c, dbgen.CancelBuildOrderParams{
		ID:       bo.ID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusConflict,
			gin.H{"error": "cannot cancel — status: " + bo.Status})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    cancelled,
		"message": cancelled.BoNumber + " cancelled",
	})
}
