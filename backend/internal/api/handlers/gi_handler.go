package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"supplyxerp/backend/internal/agent/inventory"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type GIHandler struct {
	Repo     *repository.UnitOfWork
	Workflow *inventory.GIWorkflow
}

func NewGIHandler(repo *repository.UnitOfWork, workflow *inventory.GIWorkflow) *GIHandler {
	return &GIHandler{
		Repo:     repo,
		Workflow: workflow,
	}
}

type PostGIRequest struct {
	ProductID     int64   `json:"product_id"`
	Quantity      float64 `json:"quantity"`
	Unit          string  `json:"unit"`
	ZoneID        int64   `json:"zone_id"`
	MovementType  string  `json:"movement_type" binding:"required"` // 261, 551, 601
	DocumentDate  string  `json:"document_date"`
	PostingDate   string  `json:"posting_date"`
	ReasonCode    string  `json:"reason_code"`
	ReasonText    string  `json:"reason_text"`
	CostCentre    string  `json:"cost_centre"`
	ReferenceType string  `json:"reference_type"` // BUILD_ORDER, SALES_ORDER, MANUAL
	ReferenceID   int64   `json:"reference_id"`
	Notes         string  `json:"notes"`
	HUID          int64   `json:"hu_id"`
	ReservationID int64   `json:"reservation_id"`
	HUIDs         []int64 `json:"hu_ids"`
}

func (h *GIHandler) PostGI(c *gin.Context) {
	var req PostGIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := mustTenantID(c)
	userID := mustUserID(c)

	if len(req.HUIDs) > 0 {
		var totalQty float64
		var prodID int64
		var zoneID int64
		var unit string
		var siteID int64
		var orgID int64

		// 1. Resolve first HU
		err := h.Repo.Zones.GetDb().QueryRow(c.Request.Context(), `
			SELECT hu.product_id, hu.zone_id, p.base_unit, hu.site_id, s.organisation_id
			FROM handling_units hu
			JOIN products p ON p.id = hu.product_id
			JOIN sites s ON s.id = hu.site_id
			WHERE hu.id = $1 AND hu.tenant_id = $2
		`, req.HUIDs[0], tenantID).Scan(&prodID, &zoneID, &unit, &siteID, &orgID)

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid initial HU ID"})
			return
		}

		docDate, _ := time.Parse("2006-01-02", req.DocumentDate)
		postDate, _ := time.Parse("2006-01-02", req.PostingDate)
		if docDate.IsZero() { docDate = time.Now() }
		if postDate.IsZero() { postDate = time.Now() }

		giID, err := h.Repo.GI.Create(c.Request.Context(), repository.GIDocument{
			TenantID:       tenantID,
			OrganisationID: orgID,
			SiteID:         siteID,
			ZoneID:         zoneID,
			Status:         "POSTED",
			DocumentDate:   docDate,
			PostingDate:    postDate,
			MovementType:   req.MovementType,
			ReasonCode:     req.ReasonCode,
			ReasonText:     req.ReasonText,
			CostCentre:     req.CostCentre,
			ReferenceType:  req.ReferenceType,
			Notes:          req.Notes,
			PostedBy:       &userID,
			CreatedBy:      &userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create GI document"})
			return
		}

		for _, hid := range req.HUIDs {
			var hQty float64
			err := h.Repo.Zones.GetDb().QueryRow(c.Request.Context(), 
				"SELECT quantity FROM handling_units WHERE id = $1 AND tenant_id = $2", hid, tenantID).Scan(&hQty)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid HU ID %d", hid)})
				return
			}
			totalQty += hQty

			_ = h.Repo.GI.AddLine(c.Request.Context(), repository.GILine{
				LineNumber:   1,
				ProductID:    prodID,
				Quantity:     hQty,
				Unit:         unit,
				StockType:    "UNRESTRICTED",
				MovementType: req.MovementType,
				HUID:         &hid,
			}, giID, tenantID)

			if req.MovementType == "261" || req.MovementType == "GI_PRODUCTION" {
				_, _ = h.Repo.Zones.GetDb().Exec(c.Request.Context(), 
					"UPDATE handling_units SET stock_type = 'IN_PROCESS', updated_at = NOW() WHERE id = $1", hid)

				_, _ = h.Repo.Zones.GetDb().Exec(c.Request.Context(), `
					INSERT INTO inventory_events (tenant_id, event_type, hu_id, product_id, from_zone_id, site_id, zone_id, quantity, unit, actor_user_id, stock_type, metadata)
					VALUES ($1, 'GI', $2, $3, $4, $5, $6, 0, $7, $8, 'IN_PROCESS', $9)
				`, tenantID, hid, prodID, zoneID, siteID, zoneID, unit, userID, []byte(fmt.Sprintf(`{"reference_type": "GI_DOCUMENT", "reference_id": %d}`, giID)))
			} else {
				_, _ = h.Repo.Zones.GetDb().Exec(c.Request.Context(), 
					"UPDATE handling_units SET status = 'CONSUMED', updated_at = NOW() WHERE id = $1", hid)

				_ = h.Workflow.InventoryAgent.PostOutboundEvent(c.Request.Context(), h.Repo, tenantID, hid, prodID, hQty, unit, siteID, zoneID, userID, "GI_DOCUMENT", giID)
			}
		}

		c.JSON(http.StatusCreated, gin.H{
			"success": true,
			"data": map[string]any{
				"gi_id":         giID,
				"total_qty":     totalQty,
				"movement_type": req.MovementType,
			},
		})
		return
	}

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

	var refID *int64
	if req.ReferenceID != 0 {
		refID = &req.ReferenceID
	}
	var huID *int64
	if req.HUID != 0 {
		huID = &req.HUID
	}
	var resID *int64
	if req.ReservationID != 0 {
		resID = &req.ReservationID
	}

	res, err := h.Workflow.ProcessGI(c.Request.Context(), h.Repo, inventory.GIParams{
		TenantID:       tenantID,
		OrganisationID: orgID,
		SiteID:         siteID,
		ZoneID:         req.ZoneID,
		ProductID:      req.ProductID,
		Quantity:       req.Quantity,
		Unit:           req.Unit,
		DocumentDate:   docDate,
		PostingDate:    postDate,
		MovementType:   req.MovementType,
		ReasonCode:     req.ReasonCode,
		ReasonText:     req.ReasonText,
		CostCentre:     req.CostCentre,
		ReferenceType:  req.ReferenceType,
		ReferenceID:    refID,
		Notes:          req.Notes,
		StockType:      "UNRESTRICTED",
		ActorUserID:    userID,
		HUID:           huID,
		ReservationID:  resID,
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

func (h *GIHandler) ListGIs(c *gin.Context) {
	tenantID := mustTenantID(c)
	movementType := c.DefaultQuery("movement_type", "ALL")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	docs, err := h.Repo.GI.List(c.Request.Context(), tenantID, movementType, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list GIs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"gi_documents": docs})
}

func (h *GIHandler) GetGI(c *gin.Context) {
	tenantID := mustTenantID(c)
	giID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	doc, err := h.Repo.GI.GetByID(c.Request.Context(), tenantID, giID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "GI document not found"})
		return
	}

	lines, err := h.Repo.GI.GetLines(c.Request.Context(), giID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch GI lines"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"gi_document": doc,
		"lines":       lines,
	})
}

func (h *GIHandler) GetStats(c *gin.Context) {
	tenantID := mustTenantID(c)
	stats, err := h.Repo.GI.GetStats(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get GI stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}
