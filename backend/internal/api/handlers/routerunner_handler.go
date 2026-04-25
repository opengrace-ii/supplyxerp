package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/logger"
)

type RouteRunnerHandler struct {
	Pool *pgxpool.Pool
}

func (h *RouteRunnerHandler) ListShipments(c *gin.Context) {
	status := c.Query("status")
	customerID := c.Query("customer_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	query := `
		SELECT s.*, c.name as customer_name, d.deal_number
		FROM shipments s
		JOIN customers c ON s.customer_id = c.id
		LEFT JOIN deals d ON s.deal_id = d.id
		WHERE 1=1
	`
	args := []any{}
	argIdx := 1

	if status != "" {
		query += fmt.Sprintf(" AND s.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if customerID != "" {
		query += fmt.Sprintf(" AND s.customer_id = $%d", argIdx)
		args = append(args, customerID)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY s.created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch shipments"})
		return
	}
	defer rows.Close()

	var results = []any{}
	for rows.Next() {
		vals, _ := rows.Values()
		colNames := rows.FieldDescriptions()
		m := make(map[string]any)
		for i, col := range colNames {
			m[string(col.Name)] = vals[i]
		}
		results = append(results, m)
	}

	c.JSON(200, gin.H{"shipments": results})
}

func (h *RouteRunnerHandler) CreateShipment(c *gin.Context) {
	var req struct {
		DealID           int64  `json:"deal_id"`
		Carrier          string `json:"carrier"`
		TrackingNumber   string `json:"tracking_number"`
		DispatchZone     string `json:"dispatch_zone"`
		ScheduledDispatch string `json:"scheduled_dispatch"`
		DeliveryAddress  string `json:"delivery_address"`
		Notes            string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	username, _ := c.Get("username")
	userStr := fmt.Sprintf("%v", username)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "Tx fail"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	// Get deal details
	var customerID int64
	var dealNum string
	err = tx.QueryRow(c.Request.Context(), "SELECT customer_id, deal_number FROM deals WHERE id = $1", req.DealID).Scan(&customerID, &dealNum)
	if err != nil {
		c.JSON(400, gin.H{"error": "Deal not found"})
		return
	}

	year := time.Now().Year()
	var seq int
	tx.QueryRow(c.Request.Context(), "SELECT COUNT(*) + 1 FROM shipments").Scan(&seq)
	shipmentNumber := fmt.Sprintf("SHIP-%d-%05d", year, seq)

	var id int64
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO shipments (shipment_number, deal_id, customer_id, carrier, tracking_number, dispatch_zone, scheduled_dispatch, delivery_address, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
	`, shipmentNumber, req.DealID, customerID, req.Carrier, req.TrackingNumber, req.DispatchZone, req.ScheduledDispatch, req.DeliveryAddress, req.Notes, userStr).Scan(&id)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Create shipment lines from deal lines
	_, err = tx.Exec(c.Request.Context(), `
		INSERT INTO shipment_lines (shipment_id, deal_line_no, material_id, description, planned_qty, unit_of_measure)
		SELECT $1, line_no, material_id, description, confirmed_qty, unit_of_measure
		FROM deal_lines WHERE deal_id = $2 AND confirmed_qty > 0
	`, id, req.DealID)

	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create shipment lines"})
		return
	}

	// Update deal status
	tx.Exec(c.Request.Context(), "UPDATE deals SET status = 'IN_PICK' WHERE id = $1", req.DealID)

	tx.Commit(c.Request.Context())
	c.JSON(201, gin.H{"id": id, "shipment_number": shipmentNumber})
}

func (h *RouteRunnerHandler) GetShipment(c *gin.Context) {
	id := c.Param("id")
	
	// Header
	var shipment map[string]any
	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT s.*, c.name as customer_name, d.deal_number
		FROM shipments s 
		JOIN customers c ON s.customer_id = c.id
		LEFT JOIN deals d ON s.deal_id = d.id
		WHERE s.id = $1
	`, id)
	defer rows.Close()
	if rows.Next() {
		vals, _ := rows.Values()
		colNames := rows.FieldDescriptions()
		shipment = make(map[string]any)
		for i, col := range colNames {
			shipment[string(col.Name)] = vals[i]
		}
	} else {
		c.JSON(404, gin.H{"error": "Shipment not found"})
		return
	}
	rows.Close()

	// Lines
	lineRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT sl.*, p.name as material_name, p.code as material_code
		FROM shipment_lines sl LEFT JOIN products p ON sl.material_id = p.id
		WHERE sl.shipment_id = $1 ORDER BY sl.deal_line_no
	`, id)
	defer lineRows.Close()
	var lines = []any{}
	for lineRows.Next() {
		vals, _ := lineRows.Values()
		colNames := lineRows.FieldDescriptions()
		m := make(map[string]any)
		for i, col := range colNames {
			m[string(col.Name)] = vals[i]
		}
		lines = append(lines, m)
	}

	c.JSON(200, gin.H{"shipment": shipment, "lines": lines})
}

func (h *RouteRunnerHandler) AssignHU(c *gin.Context) {
	shipmentID := c.Param("id")
	lineID := c.Param("line_id")
	var req struct {
		HUCode string  `json:"hu_code"`
		Qty    float64 `json:"qty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "Tx fail"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	_, err = tx.Exec(c.Request.Context(), `
		UPDATE shipment_lines 
		SET hu_codes = array_append(COALESCE(hu_codes, ARRAY[]::TEXT[]), $1),
		    packed_qty = packed_qty + $2,
		    status = CASE WHEN packed_qty + $2 >= planned_qty THEN 'PACKED' ELSE 'PICKING' END
		WHERE id = $3 AND shipment_id = $4
	`, req.HUCode, req.Qty, lineID, shipmentID)

	if err != nil {
		c.JSON(500, gin.H{"error": "Update fail"})
		return
	}

	tx.Commit(c.Request.Context())
	c.JSON(200, gin.H{"success": true})
}

func (h *RouteRunnerHandler) PackShipment(c *gin.Context) {
	id := c.Param("id")
	
	// Validate all lines are packed
	var count int
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM shipment_lines WHERE shipment_id = $1 AND status != 'PACKED'", id).Scan(&count)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	if count > 0 {
		c.JSON(400, gin.H{"error": "Some lines are not fully packed"})
		return
	}

	_, err = h.Pool.Exec(c.Request.Context(), "UPDATE shipments SET status = 'PACKED' WHERE id = $1", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"success": true})
}

func (h *RouteRunnerHandler) DispatchShipment(c *gin.Context) {
	id := c.Param("id")

	// Check status
	var status, shipNum, dealID string
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT status, shipment_number, deal_id FROM shipments WHERE id = $1", id).Scan(&status, &shipNum, &dealID)
	if err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}
	if status != "PACKED" {
		c.JSON(400, gin.H{"error": "Only PACKED shipments can be dispatched"})
		return
	}

	_, err = h.Pool.Exec(c.Request.Context(), "UPDATE shipments SET status = 'DISPATCHED', actual_dispatch = NOW() WHERE id = $1", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	logger.LogInfo("ROUTERUNNER", "DispatchShipment", fmt.Sprintf("Shipment dispatched: number=%s deal=%s", shipNum, dealID))
	c.JSON(200, gin.H{"success": true})
}

func (h *RouteRunnerHandler) ConfirmDelivery(c *gin.Context) {
	id := c.Param("id")

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "Tx fail"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var dealID int64
	err = tx.QueryRow(c.Request.Context(), "UPDATE shipments SET status = 'DELIVERED' WHERE id = $1 RETURNING deal_id", id).Scan(&dealID)
	if err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}

	// Update deal status
	tx.Exec(c.Request.Context(), "UPDATE deals SET status = 'DELIVERED', payment_status = 'UNPAID' WHERE id = $1", dealID)

	tx.Commit(c.Request.Context())
	c.JSON(200, gin.H{"success": true})
}
