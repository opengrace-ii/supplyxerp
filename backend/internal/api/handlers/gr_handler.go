package handlers

import (
	"net/http"
	"strconv"
	"time"

	"supplyxerp/backend/internal/agent/inventory"
	"supplyxerp/backend/internal/agent/warehouse"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type GRHandler struct {
	Repo           *repository.UnitOfWork
	Workflow       *inventory.GRWorkflow
	WarehouseAgent *warehouse.Agent
}

func NewGRHandler(repo *repository.UnitOfWork, workflow *inventory.GRWorkflow, whAgent *warehouse.Agent) *GRHandler {
	return &GRHandler{Repo: repo, Workflow: workflow, WarehouseAgent: whAgent}
}

type PostGRRequest struct {
	ProductID          int64      `json:"product_id" binding:"required"`
	Quantity           float64    `json:"quantity" binding:"required"`
	Unit               string     `json:"unit" binding:"required"`
	ZoneID             int64      `json:"zone_id" binding:"required"`
	DocumentDate       string     `json:"document_date"`
	PostingDate        string     `json:"posting_date"`
	MovementType       string     `json:"movement_type"`
	SupplierID         int64      `json:"supplier_id"`
	SupplierRef        string     `json:"supplier_ref"`
	DeliveryNoteNumber string     `json:"delivery_note_number"`
	BillOfLading       string     `json:"bill_of_lading"`
	Notes              string     `json:"notes"`
	BatchRef           string     `json:"batch_ref"`
	ExpiryDate         *time.Time `json:"expiry_date"`
	StockType          string     `json:"stock_type"`
	POID               int64      `json:"po_id"`
	POLineID           int64      `json:"po_line_id"`
}

func (h *GRHandler) PostGR(c *gin.Context) {
	var req PostGRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)

	// In Phase 1, we assume a single Site/Org for simplicity or fetch first available
	var siteID, orgID int64
	err := h.Repo.Zones.GetDb().QueryRow(c.Request.Context(), "SELECT site_id FROM zones WHERE id = $1", req.ZoneID).Scan(&siteID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid zone ID"})
		return
	}
	h.Repo.Zones.GetDb().QueryRow(c.Request.Context(), "SELECT organisation_id FROM sites WHERE id = $1", siteID).Scan(&orgID)

	docDate, _ := time.Parse("2006-01-02", req.DocumentDate)
	postDate, _ := time.Parse("2006-01-02", req.PostingDate)
	if docDate.IsZero() {
		docDate = time.Now()
	}
	if postDate.IsZero() {
		postDate = time.Now()
	}

	mType := req.MovementType
	if mType == "" {
		mType = "101"
	}
	sType := req.StockType
	if sType == "" {
		sType = "UNRESTRICTED"
	}

	var supplierID *int64
	if req.SupplierID != 0 {
		supplierID = &req.SupplierID
	}

	res, err := h.Workflow.ProcessGR(c.Request.Context(), h.Repo, inventory.GRParams{
		TenantID:           tenantID,
		OrganisationID:     orgID,
		SiteID:             siteID,
		ZoneID:             req.ZoneID,
		ProductID:          req.ProductID,
		Quantity:           req.Quantity,
		Unit:               req.Unit,
		DocumentDate:       docDate,
		PostingDate:        postDate,
		MovementType:       mType,
		SupplierID:         supplierID,
		SupplierRef:        req.SupplierRef,
		DeliveryNoteNumber: req.DeliveryNoteNumber,
		BillOfLading:       req.BillOfLading,
		Notes:              req.Notes,
		BatchRef:           req.BatchRef,
		ExpiryDate:         req.ExpiryDate,
		StockType:          sType,
		ActorUserID:        userID,
		POID:               req.POID,
		POLineID:           req.POLineID,
	})

	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    res,
	})
}

func (h *GRHandler) ListGRs(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	grs, err := h.Repo.GR.List(c.Request.Context(), tenantID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list GRs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"grs": grs})
}

func (h *GRHandler) GetGR(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	grID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	doc, err := h.Repo.GR.GetByID(c.Request.Context(), tenantID, grID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "GR not found"})
		return
	}

	lines, err := h.Repo.GR.GetDetails(c.Request.Context(), grID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch GR lines"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"gr_document": doc,
		"lines":       lines,
	})
}

func (h *GRHandler) GetStats(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	stats, err := h.Repo.GR.GetStats(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *GRHandler) ListPutawayTasks(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	tasks, err := h.Repo.WarehouseTasks.ListOpenByTenant(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tasks"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func (h *GRHandler) CompletePutaway(c *gin.Context) {
	idStr := c.Param("id")
	taskID, _ := strconv.ParseInt(idStr, 10, 64)
	
	var req struct {
		ToZoneID int64 `json:"to_zone_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)

	err := h.WarehouseAgent.CompletePutawayTask(c.Request.Context(), h.Repo, tenantID, userID, taskID, req.ToZoneID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
