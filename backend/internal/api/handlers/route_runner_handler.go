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

type RouteRunnerHandler struct {
	queries *dbgen.Queries
}

func NewRouteRunnerHandler(q *dbgen.Queries) *RouteRunnerHandler {
	return &RouteRunnerHandler{queries: q}
}

// ── Carriers ──────────────────────────────────────────────────────────────────

func (h *RouteRunnerHandler) ListCarriers(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	carriers, err := h.queries.ListCarriers(c, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": carriers})
}

// ── Shipments ─────────────────────────────────────────────────────────────────

func (h *RouteRunnerHandler) GetDashboard(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	dash, err := h.queries.GetRouteRunnerDashboard(c, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": dash})
}

func (h *RouteRunnerHandler) ListShipments(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	limit := int32(50)
	offset := int32(0)
	if l, err := strconv.Atoi(c.Query("limit")); err == nil {
		limit = int32(l)
	}
	if p, err := strconv.Atoi(c.Query("page")); err == nil {
		offset = int32(p) * limit
	}

	shipments, err := h.queries.ListShipments(c, dbgen.ListShipmentsParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": shipments})
}

func (h *RouteRunnerHandler) CreateShipment(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID := c.MustGet("user_id").(int64)

	var req struct {
		SalesOrderID  *int64  `json:"sales_order_id"`
		ShipToAddress string  `json:"ship_to_address"`
		ShipToCity    string  `json:"ship_to_city"`
		ShipToCountry string  `json:"ship_to_country"`
		PlannedDate   string  `json:"planned_date"`
		Notes         string  `json:"notes"`
		Lines         []struct {
			SOLineID      *int64  `json:"sales_order_line_id"`
			MaterialID    *int64  `json:"material_id"`
			Description   string  `json:"description" binding:"required"`
			Quantity      float64 `json:"quantity"    binding:"required,gt=0"`
			UnitOfMeasure string  `json:"unit_of_measure"`
		} `json:"lines" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	country := req.ShipToCountry
	if country == "" {
		country = "GB"
	}

	var plannedDate pgtype.Date
	if req.PlannedDate != "" {
		if t, err := time.Parse("2006-01-02", req.PlannedDate); err == nil {
			plannedDate = pgtype.Date{Time: t, Valid: true}
		}
	}

	shipment, err := h.queries.CreateShipment(c, dbgen.CreateShipmentParams{
		TenantID:      tenantID,
		SalesOrderID:  pgtype.Int8{Int64: int64Value(req.SalesOrderID), Valid: req.SalesOrderID != nil},
		CarrierID:     pgtype.Int8{Valid: false},
		ShipToAddress: stringToText(req.ShipToAddress),
		ShipToCity:    stringToText(req.ShipToCity),
		ShipToCountry: pgtype.Text{String: country, Valid: true},
		PlannedDate:   plannedDate,
		Notes:         stringToText(req.Notes),
		CreatedBy:     int64ToInt8(userID),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for i, line := range req.Lines {
		uom := line.UnitOfMeasure
		if uom == "" {
			uom = "EA"
		}
		_, err := h.queries.AddShipmentLine(c, dbgen.AddShipmentLineParams{
			ShipmentID:       shipment.ID,
			SalesOrderLineID: pgtype.Int8{Int64: int64Value(line.SOLineID), Valid: line.SOLineID != nil},
			LineNumber:       int32(i + 1),
			Description:      line.Description,
			Quantity:         numericFromFloat(line.Quantity),
			UnitOfMeasure:    uom,
			MaterialID:       pgtype.Int8{Int64: int64Value(line.MaterialID), Valid: line.MaterialID != nil},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError,
				gin.H{"error": "line " + strconv.Itoa(i+1) + ": " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    shipment,
		"message": "Shipment " + shipment.ShipmentNumber + " created",
	})
}

func (h *RouteRunnerHandler) GetShipment(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idStr := c.Param("id")
	publicID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment id"})
		return
	}

	shipment, err := h.queries.GetShipmentByPublicID(c, dbgen.GetShipmentByPublicIDParams{
		PublicID: publicID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	lines, err := h.queries.GetShipmentLines(c, shipment.ID)
	if err != nil {
		lines = []dbgen.GetShipmentLinesRow{}
	}

	c.JSON(http.StatusOK, gin.H{"data": shipment, "lines": lines})
}

func (h *RouteRunnerHandler) AssignCarrier(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idStr := c.Param("id")
	publicID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment id"})
		return
	}

	var req struct {
		CarrierID   int64  `json:"carrier_id"   binding:"required"`
		TrackingRef string `json:"tracking_ref"`
		PlannedDate string `json:"planned_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shipment, err := h.queries.GetShipmentByPublicID(c, dbgen.GetShipmentByPublicIDParams{
		PublicID: publicID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	var plannedDate pgtype.Date
	if req.PlannedDate != "" {
		if t, err := time.Parse("2006-01-02", req.PlannedDate); err == nil {
			plannedDate = pgtype.Date{Time: t, Valid: true}
		}
	}

	updated, err := h.queries.AssignCarrier(c, dbgen.AssignCarrierParams{
		ID:          shipment.ID,
		CarrierID:   pgtype.Int8{Int64: req.CarrierID, Valid: true},
		TrackingRef: stringToText(req.TrackingRef),
		PlannedDate: plannedDate,
		TenantID:    tenantID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    updated,
		"message": "Carrier assigned to " + updated.ShipmentNumber,
	})
}

func (h *RouteRunnerHandler) DispatchShipment(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idStr := c.Param("id")
	publicID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment id"})
		return
	}

	shipment, err := h.queries.GetShipmentByPublicID(c, dbgen.GetShipmentByPublicIDParams{
		PublicID: publicID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	// Guard: carrier must be assigned before dispatch
	if !shipment.CarrierID.Valid {
		c.JSON(http.StatusConflict,
			gin.H{"error": "assign a carrier before dispatching"})
		return
	}

	dispatched, err := h.queries.DispatchShipment(c, dbgen.DispatchShipmentParams{
		ID:       shipment.ID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusConflict,
			gin.H{"error": "cannot dispatch — current status: " + shipment.Status})
		return
	}

	go TriggerDispatch(c, h.queries, tenantID, "SHIPMENT_DISPATCHED",
		"SHIPMENT", dispatched.ID, dispatched.ShipmentNumber,
		DispatchContext{
			"shipment_number": dispatched.ShipmentNumber,
			"carrier_name":    shipment.CarrierName.String,
			"tracking_ref":    dispatched.TrackingRef.String,
			"dispatch_date":   dispatched.DispatchedAt.Time.Format("2006-01-02"),
		})

	c.JSON(http.StatusOK, gin.H{
		"data":    dispatched,
		"message": dispatched.ShipmentNumber + " dispatched",
	})
}

func (h *RouteRunnerHandler) MarkDelivered(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idStr := c.Param("id")
	publicID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid shipment id"})
		return
	}

	shipment, err := h.queries.GetShipmentByPublicID(c, dbgen.GetShipmentByPublicIDParams{
		PublicID: publicID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	delivered, err := h.queries.MarkDelivered(c, dbgen.MarkDeliveredParams{
		ID:       shipment.ID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(http.StatusConflict,
			gin.H{"error": "cannot mark delivered — status: " + shipment.Status})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    delivered,
		"message": delivered.ShipmentNumber + " delivered",
	})
}

// Internal helpers
func int64Value(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}
