package handlers

import (
	"fmt"
	"net/http"

	"supplyxerp/backend/internal/repository"
	"supplyxerp/backend/internal/db/dbgen"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ConfigHandler struct {
	Repo *repository.UnitOfWork
	Pool *pgxpool.Pool
}

func NewConfigHandler(repo *repository.UnitOfWork, pool *pgxpool.Pool) *ConfigHandler {
	return &ConfigHandler{Repo: repo, Pool: pool}
}

type CapabilityMap map[string]any

func (h *ConfigHandler) GetCaps(c *repository.TenantConfig) CapabilityMap {
	return CapabilityMap{
		"has_production":      c.DomainProfile != "RETAIL" && c.DomainProfile != "DISTRIBUTION",
		"has_quality":         c.QCOnReceipt || c.DomainProfile == "PHARMA" || c.DomainProfile == "FOOD" || c.DomainProfile == "MANUFACTURING",
		"has_batch_tracking":  c.BatchTracking,
		"has_expiry_tracking": c.ExpiryTracking,
		"has_serial_tracking": c.SerialTracking,
		"default_uom":         c.DefaultUOM,
		"fifo_enforced":       c.FIFOEnforced,
	}
}

func (h *ConfigHandler) GetTenantConfig(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	cfg, err := h.Repo.Config.GetByTenant(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"config":       cfg,
		"capabilities": h.GetCaps(cfg),
	})
}

func (h *ConfigHandler) UpdateTenantConfig(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req repository.TenantConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.TenantID = tenantID
	if err := h.Repo.Config.Update(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

var DOMAIN_PROFILES = map[string]map[string]any{
	"GENERAL":       {"has_production": false, "has_quality": false, "batch": false, "expiry": false, "serial": false, "uom": "QTY", "fifo": false},
	"MANUFACTURING": {"has_production": true, "has_quality": true, "batch": true, "expiry": false, "serial": false, "uom": "KG", "fifo": false},
	"DISTRIBUTION":  {"has_production": false, "has_quality": false, "batch": false, "expiry": false, "serial": false, "uom": "QTY", "fifo": false},
	"RETAIL":        {"has_production": false, "has_quality": false, "batch": false, "expiry": false, "serial": false, "uom": "PCS", "fifo": false},
	"PHARMA":        {"has_production": true, "has_quality": true, "batch": true, "expiry": true, "serial": true, "uom": "QTY", "fifo": true},
	"TEXTILE":       {"has_production": true, "has_quality": false, "batch": true, "expiry": false, "serial": false, "uom": "KG", "fifo": false},
	"CONSTRUCTION":  {"has_production": true, "has_quality": false, "batch": false, "expiry": false, "serial": false, "uom": "QTY", "fifo": false},
	"FOOD":          {"has_production": false, "has_quality": true, "batch": true, "expiry": true, "serial": false, "uom": "KG", "fifo": true},
}

func (h *ConfigHandler) ListProfiles(c *gin.Context) {
	c.JSON(http.StatusOK, DOMAIN_PROFILES)
}

func (h *ConfigHandler) ApplyProfile(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct{ Profile string `json:"profile"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	defaults, ok := DOMAIN_PROFILES[req.Profile]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile"})
		return
	}

	cfg, _ := h.Repo.Config.GetByTenant(c.Request.Context(), tenantID)
	cfg.DomainProfile = req.Profile
	cfg.BatchTracking = defaults["batch"].(bool)
	cfg.ExpiryTracking = defaults["expiry"].(bool)
	cfg.SerialTracking = defaults["serial"].(bool)
	cfg.DefaultUOM = defaults["uom"].(string)
	cfg.FIFOEnforced = defaults["fifo"].(bool)
	cfg.QCOnReceipt = defaults["has_quality"].(bool)

	h.Repo.Config.Update(c.Request.Context(), *cfg)

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"capabilities": h.GetCaps(cfg),
	})
}

func (h *ConfigHandler) ApplySequence(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)
	var req struct {
		Type  string `json:"sequence_type"`
		Start int64  `json:"start_from"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Decision 1: Guard against backwards re-seeding
	var maxVal int64
	var query string
	switch req.Type {
	case "GR":
		query = "SELECT COALESCE(MAX(substring(gr_number from '[0-9]+$')::BIGINT), 0) FROM gr_documents WHERE tenant_id = $1"
	case "HU":
		query = "SELECT COALESCE(MAX(substring(code from '[0-9]+$')::BIGINT), 0) FROM barcodes WHERE tenant_id = $1 AND entity_type = 'HU'"
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported sequence type"})
		return
	}

	h.Pool.QueryRow(c.Request.Context(), query, tenantID).Scan(&maxVal)

	if req.Start <= maxVal {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Cannot re-seed to %d — existing documents reach %d", req.Start, maxVal),
		})
		return
	}

	// EXECUTE
	err := h.Repo.Config.ReseedSequence(c.Request.Context(), tenantID, req.Type, req.Start-1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Reseed failed"})
		return
	}

	// Audit
	h.Repo.Audit.Log(c.Request.Context(), tenantID, actorID, "SEQUENCE_RESEED", "TENANT_CONFIG", tenantID, nil, req)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"new_current": req.Start - 1,
	})
}

// RFQ Configuration

func (h *ConfigHandler) GetRFQTypes(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	q := dbgen.New(h.Pool)

	types, err := q.GetRFQTypes(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch RFQ types"})
		return
	}

	if len(types) == 0 {
		// Auto-seed
		q.CreateRFQType(c.Request.Context(), dbgen.CreateRFQTypeParams{TenantID: tenantID, TypeCode: "AN", Description: "Standard RFQ", IsGpBid: false})
		q.CreateRFQType(c.Request.Context(), dbgen.CreateRFQTypeParams{TenantID: tenantID, TypeCode: "AB", Description: "GP Bid", IsGpBid: true})
		types, _ = q.GetRFQTypes(c.Request.Context(), tenantID)
	}

	c.JSON(http.StatusOK, types)
}

func (h *ConfigHandler) CreateRFQType(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		TypeCode    string `json:"type_code"`
		Description string `json:"description"`
		IsGpBid     bool   `json:"is_gp_bid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	q := dbgen.New(h.Pool)
	res, err := q.CreateRFQType(c.Request.Context(), dbgen.CreateRFQTypeParams{
		TenantID:    tenantID,
		TypeCode:    req.TypeCode,
		Description: req.Description,
		IsGpBid:     req.IsGpBid,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create RFQ type"})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *ConfigHandler) GetOrderReasons(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	q := dbgen.New(h.Pool)

	reasons, err := q.GetOrderReasons(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order reasons"})
		return
	}

	if len(reasons) == 0 {
		// Auto-seed
		q.CreateOrderReason(c.Request.Context(), dbgen.CreateOrderReasonParams{TenantID: tenantID, ReasonCode: "001", Description: "New Material"})
		q.CreateOrderReason(c.Request.Context(), dbgen.CreateOrderReasonParams{TenantID: tenantID, ReasonCode: "002", Description: "New Vendor"})
		q.CreateOrderReason(c.Request.Context(), dbgen.CreateOrderReasonParams{TenantID: tenantID, ReasonCode: "003", Description: "Price Review"})
		reasons, _ = q.GetOrderReasons(c.Request.Context(), tenantID)
	}

	c.JSON(http.StatusOK, reasons)
}

func (h *ConfigHandler) CreateOrderReason(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		ReasonCode  string `json:"reason_code"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	q := dbgen.New(h.Pool)
	res, err := q.CreateOrderReason(c.Request.Context(), dbgen.CreateOrderReasonParams{
		TenantID:    tenantID,
		ReasonCode:  req.ReasonCode,
		Description: req.Description,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order reason"})
		return
	}
	c.JSON(http.StatusOK, res)
}
