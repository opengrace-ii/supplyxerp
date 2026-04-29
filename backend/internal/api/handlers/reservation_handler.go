package handlers

import (
	"net/http"
	"strconv"
	"time"

	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type ReservationHandler struct {
	Repo *repository.UnitOfWork
}

func NewReservationHandler(repo *repository.UnitOfWork) *ReservationHandler {
	return &ReservationHandler{Repo: repo}
}

type CreateReservationRequest struct {
	ProductID       int64   `json:"product_id" binding:"required"`
	SiteID          int64   `json:"site_id" binding:"required"`
	ZoneID          int64   `json:"zone_id"`
	Quantity        float64 `json:"quantity" binding:"required"`
	Unit            string  `json:"unit" binding:"required"`
	MovementType    string  `json:"movement_type"`
	ReservedByType  string  `json:"reserved_by_type"` // BUILD_ORDER, SALES_ORDER, MANUAL
	ReservedByID    int64   `json:"reserved_by_id"`
	RequirementDate string  `json:"requirement_date"`
	ValidUntil      string  `json:"valid_until"`
	Notes           string  `json:"notes"`
}

func (h *ReservationHandler) CreateReservation(c *gin.Context) {
	var req CreateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := mustTenantID(c)
	userID := mustUserID(c)

	reqDate, _ := time.Parse("2006-01-02", req.RequirementDate)
	validDate, _ := time.Parse("2006-01-02", req.ValidUntil)

	var zoneID *int64
	if req.ZoneID != 0 {
		zoneID = &req.ZoneID
	}
	var resByID *int64
	if req.ReservedByID != 0 {
		resByID = &req.ReservedByID
	}

	mType := req.MovementType
	if mType == "" {
		mType = "261" // Default to Issue to Production
	}
	rbType := req.ReservedByType
	if rbType == "" {
		rbType = "MANUAL"
	}

	res := repository.StockReservation{
		TenantID:        tenantID,
		ProductID:       req.ProductID,
		SiteID:          req.SiteID,
		ZoneID:          zoneID,
		Quantity:        req.Quantity,
		Unit:            req.Unit,
		MovementType:    mType,
		ReservedByType:  rbType,
		ReservedByID:    resByID,
		Notes:           req.Notes,
		CreatedBy:       &userID,
	}

	if !reqDate.IsZero() {
		res.RequirementDate = &reqDate
	}
	if !validDate.IsZero() {
		res.ValidUntil = &validDate
	}

	id, err := h.Repo.Reservations.Create(c.Request.Context(), res)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reservation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "reservation_id": id})
}

func (h *ReservationHandler) ListReservations(c *gin.Context) {
	tenantID := mustTenantID(c)
	status := c.DefaultQuery("status", "ACTIVE")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	reservations, err := h.Repo.Reservations.List(c.Request.Context(), tenantID, status, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list reservations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reservations": reservations})
}

func (h *ReservationHandler) CancelReservation(c *gin.Context) {
	tenantID := mustTenantID(c)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	err := h.Repo.Reservations.Cancel(c.Request.Context(), tenantID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel reservation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *ReservationHandler) GetSummary(c *gin.Context) {
	tenantID := mustTenantID(c)
	summary, err := h.Repo.Reservations.GetProductReservationSummary(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get reservation summary"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

func (h *ReservationHandler) GetAvailableStock(c *gin.Context) {
	tenantID := mustTenantID(c)
	productID, _ := strconv.ParseInt(c.Query("product_id"), 10, 64)
	siteID, _ := strconv.ParseInt(c.Query("site_id"), 10, 64)

	if productID == 0 || siteID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product_id and site_id are required"})
		return
	}

	unrestricted, reserved, available, err := h.Repo.Reservations.GetAvailableQty(c.Request.Context(), tenantID, productID, siteID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate available stock"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"unrestricted_qty": unrestricted,
		"reserved_qty":     reserved,
		"available_qty":    available,
	})
}
