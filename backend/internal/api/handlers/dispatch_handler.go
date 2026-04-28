package handlers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgtype"
    "supplyxerp/backend/internal/db/dbgen"
)

type DispatchHandler struct {
    queries *dbgen.Queries
}

func NewDispatchHandler(q *dbgen.Queries) *DispatchHandler {
    return &DispatchHandler{queries: q}
}

// GET /api/config/dispatch/summary
func (h *DispatchHandler) GetSummary(c *gin.Context) {
    tenantID := c.MustGet("tenant_id").(int64)
    summary, err := h.queries.GetDispatchSummary(c, tenantID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": summary})
}

// GET /api/config/dispatch/rules
func (h *DispatchHandler) ListRules(c *gin.Context) {
    tenantID := c.MustGet("tenant_id").(int64)
    rules, err := h.queries.ListDispatchRules(c, tenantID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": rules})
}

// POST /api/config/dispatch/rules
func (h *DispatchHandler) CreateRule(c *gin.Context) {
    tenantID := c.MustGet("tenant_id").(int64)

    var req struct {
        RuleName        string `json:"rule_name"        binding:"required"`
        TriggerEvent    string `json:"trigger_event"    binding:"required"`
        Channel         string `json:"channel"          binding:"required"`
        RecipientType   string `json:"recipient_type"`
        RecipientValue  string `json:"recipient_value"  binding:"required"`
        SubjectTemplate string `json:"subject_template"`
        BodyTemplate    string `json:"body_template"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    rule, err := h.queries.CreateDispatchRule(c, dbgen.CreateDispatchRuleParams{
        TenantID:        tenantID,
        RuleName:        req.RuleName,
        TriggerEvent:    req.TriggerEvent,
        Channel:         req.Channel,
        RecipientType:   req.RecipientType,
        RecipientValue:  req.RecipientValue,
        SubjectTemplate: pgtype.Text{String: req.SubjectTemplate, Valid: req.SubjectTemplate != ""},
        BodyTemplate:    pgtype.Text{String: req.BodyTemplate, Valid: req.BodyTemplate != ""},
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"data": rule})
}

// PATCH /api/config/dispatch/rules/:id/toggle
func (h *DispatchHandler) ToggleRule(c *gin.Context) {
    tenantID := c.MustGet("tenant_id").(int64)
    id, err  := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
        return
    }

    var req struct {
        IsActive bool `json:"is_active"`
    }
    c.ShouldBindJSON(&req)

    rules, err := h.queries.ListDispatchRules(c, tenantID)
    var recVal string
    for _, r := range rules {
        if r.ID == id {
            recVal = r.RecipientValue
            break
        }
    }

    updated, err := h.queries.UpdateDispatchRule(c, dbgen.UpdateDispatchRuleParams{
        ID:             id,
        IsActive:       pgtype.Bool{Bool: req.IsActive, Valid: true},
        RecipientValue: recVal,
        TenantID:       tenantID,
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": updated})
}

// GET /api/config/dispatch/logs
func (h *DispatchHandler) ListLogs(c *gin.Context) {
    tenantID := c.MustGet("tenant_id").(int64)
    limit  := int32(50)
    offset := int32(0)
    if l, err := strconv.Atoi(c.Query("limit")); err == nil { limit  = int32(l) }
    if p, err := strconv.Atoi(c.Query("page"));  err == nil { offset = int32(p) * limit }

    logs, err := h.queries.ListDispatchLogs(c, dbgen.ListDispatchLogsParams{
        TenantID: tenantID,
        Limit:    limit,
        Offset:   offset,
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": logs})
}

// POST /api/config/dispatch/test — fire a test dispatch for a given event
func (h *DispatchHandler) TestDispatch(c *gin.Context) {
    tenantID := c.MustGet("tenant_id").(int64)

    var req struct {
        Event string `json:"event" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    TriggerDispatch(c, h.queries, tenantID, req.Event,
        "TEST", 0, "TEST-001",
        DispatchContext{
            "po_number":     "PO-TEST-001",
            "supplier_name": "Test Supplier",
            "so_number":     "SO-TEST-001",
            "customer_name": "Test Customer",
            "carrier_name":  "DHL Express",
            "tracking_ref":  "TEST123456",
            "qc_number":     "QC-TEST-001",
            "material_code": "FAB-001",
            "failed_qty":    "50",
            "bo_number":     "BO-TEST-001",
            "planned_qty":   "500",
            "actual_qty":    "498",
            "uom":           "KG",
            "currency":      "GBP",
            "total_amount":  "5000.00",
            "dispatch_date": "2026-04-27",
            "delivery_date": "2026-04-30",
        })

    c.JSON(http.StatusOK, gin.H{
        "message": "Test dispatch triggered for event: " + req.Event,
        "note":    "Check /api/config/dispatch/logs for results",
    })
}
