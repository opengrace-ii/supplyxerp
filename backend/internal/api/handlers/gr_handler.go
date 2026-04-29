package handlers

import (
	"net/http"
	"strconv"
	"time"

	"supplyxerp/backend/internal/agent/inventory"
	"supplyxerp/backend/internal/agent/warehouse"
	"supplyxerp/backend/internal/db/dbgen"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type GRHandler struct {
	Repo           *repository.UnitOfWork
	Workflow       *inventory.GRWorkflow
	WarehouseAgent *warehouse.Agent
	Queries        dbgen.Querier
}

func NewGRHandler(repo *repository.UnitOfWork, workflow *inventory.GRWorkflow, whAgent *warehouse.Agent) *GRHandler {
	return &GRHandler{
		Repo:           repo,
		Workflow:       workflow,
		WarehouseAgent: whAgent,
		Queries:        dbgen.New(repo.Zones.GetDb()),
	}
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
	ReferenceType      string     `json:"reference_type"`
	// Roll / serial tracking
	RollCount  *int    `json:"roll_count"`  // if set > 1, creates N HUs
	RollPrefix *string `json:"roll_prefix"` // e.g. "200-60" → serials "200-60-001".."200-60-N"
}

func (h *GRHandler) PostGR(c *gin.Context) {
	var req PostGRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := mustTenantID(c)
	userID := mustUserID(c)

	// 1. Over-delivery check
	if req.POLineID != 0 && req.ReferenceType != "NONE" {
		poLine, err := h.Queries.GetPOLineForGR(c.Request.Context(), dbgen.GetPOLineForGRParams{
			ID:       req.POLineID,
			TenantID: tenantID,
		})
		if err == nil {
			qtyReceived, _ := poLine.QtyReceived.Float64Value()
			tolerance, _ := poLine.OverdeliveryTolerancePct.Float64Value()
			
			maxAllowed := numericToFloat(poLine.Quantity) * (1 + tolerance.Float64/100)
			newTotal := qtyReceived.Float64 + req.Quantity

			if newTotal > maxAllowed && poLine.OverdeliveryRequiresApproval {
				// Create a temporary GR document to hold the line
				grID, err := h.Repo.GR.Create(c.Request.Context(), repository.GRDocument{
					TenantID:       tenantID,
					OrganisationID: 0, // Simplified, will resolve on resume
					SiteID:         0,
					ZoneID:         req.ZoneID,
					Status:         "ON_HOLD",
					DocumentDate:   time.Now(),
					PostingDate:    time.Now(),
					MovementType:   "101",
					CreatedBy:      &userID,
				})
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create GR hold document"})
					return
				}

				hold, err := h.Queries.CreateGRHold(c.Request.Context(), dbgen.CreateGRHoldParams{
					TenantID:         tenantID,
					GrID:             grID,
					PoLineID:         req.POLineID,
					PoQuantity:       poLine.Quantity,
					ReceivedQuantity: numericFromFloat(req.Quantity),
					RequestedBy:      userID,
				})
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create hold record"})
					return
				}

				h.Workflow.Hub.Broadcast("gr_hold_raised", hold)

				c.JSON(http.StatusAccepted, gin.H{
					"status":      "ON_HOLD",
					"hold_id":      hold.PublicID,
					"message":      "Quantity exceeds PO tolerance. Pending authority approval.",
					"po_qty":       numericToFloat(poLine.Quantity),
					"received_qty": req.Quantity,
					"excess_pct":   (newTotal - numericToFloat(poLine.Quantity)) / numericToFloat(poLine.Quantity) * 100,
				})
				return
			}
		}
	}

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
		Status:             "POSTED",
		RollCount:          req.RollCount,
		RollPrefix:         req.RollPrefix,
		ReferenceType:      req.ReferenceType,
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

func (h *GRHandler) GetPendingHolds(c *gin.Context) {
	tenantID := mustTenantID(c)
	holds, err := h.Queries.GetPendingOverdeliveryHolds(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch holds"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"holds": holds})
}

func (h *GRHandler) ResolveHold(c *gin.Context) {
	holdPublicID := parseUUID(c.Param("id"))
	tenantID := mustTenantID(c)
	userID := mustUserID(c)

	var req struct {
		Action string `json:"action" binding:"required"` // APPROVE | REJECT
		Note   string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Resolve hold record
	status := "REJECTED"
	if req.Action == "APPROVE" {
		status = "APPROVED"
	}

	hold, err := h.Queries.ResolveOverdeliveryHold(c.Request.Context(), dbgen.ResolveOverdeliveryHoldParams{
		Status:     status,
		ApprovedBy: userID,
		Notes:      stringToText(req.Note),
		PublicID:   holdPublicID,
		TenantID:   tenantID,
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Hold not found or already resolved"})
		return
	}

	if status == "APPROVED" {
		h.Queries.UpdateGRStatus(c.Request.Context(), dbgen.UpdateGRStatusParams{
			Status:   "POSTED",
			ID:       hold.GrID,
			TenantID: tenantID,
		})
		
		h.Workflow.Hub.Broadcast("gr_hold_approved", map[string]any{"hold_id": hold.PublicID, "gr_id": hold.GrID})
	} else {
		h.Queries.UpdateGRStatus(c.Request.Context(), dbgen.UpdateGRStatusParams{
			Status:   "REJECTED",
			ID:       hold.GrID,
			TenantID: tenantID,
		})
		h.Workflow.Hub.Broadcast("gr_hold_rejected", map[string]any{"hold_id": hold.PublicID, "gr_id": hold.GrID})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "status": status})
}

func (h *GRHandler) ListGRs(c *gin.Context) {
	tenantID := mustTenantID(c)
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
	tenantID := mustTenantID(c)
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
	tenantID := mustTenantID(c)
	stats, err := h.Repo.GR.GetStats(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *GRHandler) ListPutawayTasks(c *gin.Context) {
	tenantID := mustTenantID(c)
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

	tenantID := mustTenantID(c)
	userID := mustUserID(c)

	err := h.WarehouseAgent.CompletePutawayTask(c.Request.Context(), h.Repo, tenantID, userID, taskID, req.ToZoneID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
