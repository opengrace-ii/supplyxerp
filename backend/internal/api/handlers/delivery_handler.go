package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/logger"
)

type DeliveryHandler struct {
	Pool *pgxpool.Pool
}

func NewDeliveryHandler(pool *pgxpool.Pool) *DeliveryHandler {
	return &DeliveryHandler{Pool: pool}
}

// -----------------------------------------------------------------------------
// DELIVERY CONFIRMATIONS
// -----------------------------------------------------------------------------

func (h *DeliveryHandler) ListDCs(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}

	query := `
		SELECT dc.id, dc.dc_number, dc.po_id, dc.supplier_id, dc.delivery_date, 
		       dc.supplier_ref, dc.status, dc.total_value, dc.currency,
		       po.po_number, s.name as supplier_name
		FROM delivery_confirmations dc
		JOIN purchase_orders po ON po.id = dc.po_id
		LEFT JOIN suppliers s ON s.id = dc.supplier_id
		WHERE 1=1
	`
	args := []interface{}{}
	argN := 1

	if poID := c.Query("po_id"); poID != "" {
		query += fmt.Sprintf(" AND dc.po_id = $%d", argN)
		args = append(args, poID)
		argN++
	}
	if status := c.Query("status"); status != "" {
		query += fmt.Sprintf(" AND dc.status = $%d", argN)
		args = append(args, status)
		argN++
	}
	if from := c.Query("from"); from != "" {
		query += fmt.Sprintf(" AND dc.delivery_date >= $%d", argN)
		args = append(args, from)
		argN++
	}

	query += fmt.Sprintf(" ORDER BY dc.created_at DESC LIMIT $%d", argN)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "ListDCs", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type DC struct {
		ID            int64   `json:"id"`
		DCNumber      string  `json:"dc_number"`
		POID          int64   `json:"po_id"`
		PONumber      string  `json:"po_number"`
		SupplierID    *int64  `json:"supplier_id"`
		SupplierName  *string `json:"supplier_name"`
		DeliveryDate  string  `json:"delivery_date"`
		SupplierRef   *string `json:"supplier_ref"`
		Status        string  `json:"status"`
		TotalValue    float64 `json:"total_value"`
		Currency      *string `json:"currency"`
	}
	var dcs []DC
	for rows.Next() {
		var d DC
		var dDate time.Time
		if err := rows.Scan(&d.ID, &d.DCNumber, &d.POID, &d.SupplierID, &dDate,
			&d.SupplierRef, &d.Status, &d.TotalValue, &d.Currency,
			&d.PONumber, &d.SupplierName); err != nil {
			continue
		}
		d.DeliveryDate = dDate.Format("2006-01-02")
		dcs = append(dcs, d)
	}

	c.JSON(200, gin.H{"delivery_confirmations": dcs})
}

func (h *DeliveryHandler) CreateDC(c *gin.Context) {
	var req struct {
		POID         int64  `json:"po_id"`
		DeliveryDate string `json:"delivery_date"`
		SupplierRef  string `json:"supplier_ref"`
		Notes        string `json:"notes"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	// Get PO details
	var supplierID *int64
	var currency *string
	err := h.Pool.QueryRow(c.Request.Context(),
		"SELECT supplier_id, currency FROM purchase_orders WHERE id = $1", req.POID).
		Scan(&supplierID, &currency)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "CreateDC", err.Error())
		c.JSON(400, gin.H{"error": "PO not found"})
		return
	}

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "CreateDC", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	// Auto-generate DC number
	var count int
	tx.QueryRow(ctx, "SELECT COUNT(*) FROM delivery_confirmations WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())").Scan(&count)
	dcNumber := fmt.Sprintf("DC-%d-%05d", time.Now().Year(), count+1)

	var dcID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO delivery_confirmations (dc_number, po_id, supplier_id, delivery_date, supplier_ref, currency, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
	`, dcNumber, req.POID, supplierID, req.DeliveryDate, req.SupplierRef, currency, req.Notes, c.GetString("username")).Scan(&dcID)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "CreateDC", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	tx.Commit(ctx)
	c.JSON(201, gin.H{"id": dcID, "dc_number": dcNumber})
}

func (h *DeliveryHandler) GetDC(c *gin.Context) {
	id := c.Param("id")

	var d struct {
		ID           int64   `json:"id"`
		DCNumber     string  `json:"dc_number"`
		POID         int64   `json:"po_id"`
		PONumber     string  `json:"po_number"`
		SupplierID   *int64  `json:"supplier_id"`
		SupplierName *string `json:"supplier_name"`
		DeliveryDate string  `json:"delivery_date"`
		SupplierRef  *string `json:"supplier_ref"`
		Status       string  `json:"status"`
		TotalValue   float64 `json:"total_value"`
		Currency     *string `json:"currency"`
		Notes        *string `json:"notes"`
	}
	var dDate time.Time
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT dc.id, dc.dc_number, dc.po_id, dc.supplier_id, dc.delivery_date, 
		       dc.supplier_ref, dc.status, dc.total_value, dc.currency, dc.notes,
		       po.po_number, s.name as supplier_name
		FROM delivery_confirmations dc
		JOIN purchase_orders po ON po.id = dc.po_id
		LEFT JOIN suppliers s ON s.id = dc.supplier_id
		WHERE dc.id = $1
	`, id).Scan(&d.ID, &d.DCNumber, &d.POID, &d.SupplierID, &dDate,
		&d.SupplierRef, &d.Status, &d.TotalValue, &d.Currency, &d.Notes,
		&d.PONumber, &d.SupplierName)
	if err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}
	d.DeliveryDate = dDate.Format("2006-01-02")

	// Get lines
	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT l.id, l.po_line_no, l.material_id, p.name, l.description,
		       l.ordered_qty, l.delivered_qty, l.accepted_qty, l.rejected_qty,
		       l.unit_of_measure, l.unit_price, l.line_value, l.storage_zone,
		       l.batch_ref, l.qc_status
		FROM delivery_confirmation_lines l
		LEFT JOIN products p ON p.id = l.material_id
		WHERE l.dc_id = $1
		ORDER BY l.po_line_no
	`, id)
	defer rows.Close()

	type Line struct {
		ID            int64    `json:"id"`
		POLineNo      int      `json:"po_line_no"`
		MaterialID    *int64   `json:"material_id"`
		MaterialName  *string  `json:"material_name"`
		Description   *string  `json:"description"`
		OrderedQty    *float64 `json:"ordered_qty"`
		DeliveredQty  float64  `json:"delivered_qty"`
		AcceptedQty   *float64 `json:"accepted_qty"`
		RejectedQty   float64  `json:"rejected_qty"`
		UnitOfMeasure *string  `json:"unit_of_measure"`
		UnitPrice     *float64 `json:"unit_price"`
		LineValue     *float64 `json:"line_value"`
		StorageZone   *string  `json:"storage_zone"`
		BatchRef      *string  `json:"batch_ref"`
		QCStatus      string   `json:"qc_status"`
	}
	var lines []Line
	for rows.Next() {
		var l Line
		rows.Scan(&l.ID, &l.POLineNo, &l.MaterialID, &l.MaterialName, &l.Description,
			&l.OrderedQty, &l.DeliveredQty, &l.AcceptedQty, &l.RejectedQty,
			&l.UnitOfMeasure, &l.UnitPrice, &l.LineValue, &l.StorageZone,
			&l.BatchRef, &l.QCStatus)
		lines = append(lines, l)
	}

	c.JSON(200, gin.H{"delivery_confirmation": d, "lines": lines})
}

func (h *DeliveryHandler) UpsertDCLines(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Lines []struct {
			POLineNo     int      `json:"po_line_no"`
			MaterialID   *int64   `json:"material_id"`
			Description  string   `json:"description"`
			OrderedQty   float64  `json:"ordered_qty"`
			DeliveredQty float64  `json:"delivered_qty"`
			AcceptedQty  *float64 `json:"accepted_qty"`
			RejectedQty  float64  `json:"rejected_qty"`
			UOM          string   `json:"unit_of_measure"`
			UnitPrice    float64  `json:"unit_price"`
			StorageZone  string   `json:"storage_zone"`
			BatchRef     string   `json:"batch_ref"`
		} `json:"lines"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	// Check status
	var status string
	tx.QueryRow(ctx, "SELECT status FROM delivery_confirmations WHERE id=$1", id).Scan(&status)
	if status != "DRAFT" {
		c.JSON(400, gin.H{"error": "Can only edit DRAFT deliveries"})
		return
	}

	// Delete existing lines
	tx.Exec(ctx, "DELETE FROM delivery_confirmation_lines WHERE dc_id=$1", id)

	totalValue := 0.0
	for _, l := range req.Lines {
		if l.DeliveredQty <= 0 {
			c.JSON(400, gin.H{"error": "Delivered qty must be > 0"})
			return
		}
		accepted := l.DeliveredQty
		if l.AcceptedQty != nil {
			accepted = *l.AcceptedQty
		}
		lineVal := accepted * l.UnitPrice
		totalValue += lineVal

		_, err = tx.Exec(ctx, `
			INSERT INTO delivery_confirmation_lines 
			(dc_id, po_line_no, material_id, description, ordered_qty, delivered_qty, accepted_qty, rejected_qty, unit_of_measure, unit_price, storage_zone, batch_ref)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`, id, l.POLineNo, l.MaterialID, l.Description, l.OrderedQty, l.DeliveredQty, accepted, l.RejectedQty, l.UOM, l.UnitPrice, l.StorageZone, l.BatchRef)
		if err != nil {
			logger.LogError("DB", "DeliveryHandler", "UpsertDCLines", err.Error())
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	// Update total value
	tx.Exec(ctx, "UPDATE delivery_confirmations SET total_value=$1 WHERE id=$2", totalValue, id)

	tx.Commit(ctx)
	c.JSON(200, gin.H{"message": "Lines updated"})
}

func (h *DeliveryHandler) PostDC(c *gin.Context) {
	id := c.Param("id")

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var status, dcNumber string
	var poID int64
	var deliveryDate time.Time
	err = tx.QueryRow(ctx, "SELECT status, dc_number, po_id, delivery_date FROM delivery_confirmations WHERE id=$1 FOR UPDATE", id).Scan(&status, &dcNumber, &poID, &deliveryDate)
	if err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}
	if status != "DRAFT" {
		c.JSON(400, gin.H{"error": "Only DRAFT can be posted"})
		return
	}

	var count int
	tx.QueryRow(ctx, "SELECT COUNT(*) FROM delivery_confirmation_lines WHERE dc_id=$1", id).Scan(&count)
	if count == 0 {
		c.JSON(400, gin.H{"error": "Cannot post empty DC"})
		return
	}

	_, err = tx.Exec(ctx, "UPDATE delivery_confirmations SET status='POSTED', posted_by=$1, posted_at=NOW() WHERE id=$2", c.GetString("username"), id)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "PostDC", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Update tracking events
	tx.Exec(ctx, `
		UPDATE po_tracking_scenario_events 
		SET actual_date = $1, status = 'COMPLETED'
		WHERE po_id = $2 AND event_code = 'GOODS_RECEIPT' AND status != 'COMPLETED'
	`, deliveryDate, poID)

	logger.LogInfo("DC", "PostDeliveryConfirmation", fmt.Sprintf("DC posted: dc_number=%s po_id=%d", dcNumber, poID))

	tx.Commit(ctx)
	c.JSON(200, gin.H{"message": "Posted successfully"})
}

func (h *DeliveryHandler) ReverseDC(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Reason string `json:"reason"`
	}
	c.BindJSON(&req)

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var status string
	var poID int64
	tx.QueryRow(ctx, "SELECT status, po_id FROM delivery_confirmations WHERE id=$1 FOR UPDATE", id).Scan(&status, &poID)
	if status != "POSTED" {
		c.JSON(400, gin.H{"error": "Only POSTED can be reversed"})
		return
	}

	// Check if approved invoice exists
	var invCount int
	tx.QueryRow(ctx, "SELECT COUNT(*) FROM supplier_invoices WHERE dc_id=$1 AND status='APPROVED'", id).Scan(&invCount)
	if invCount > 0 {
		c.JSON(400, gin.H{"error": "Cannot reverse: approved invoice exists"})
		return
	}

	// Reverse gr_qty
	rows, _ := tx.Query(ctx, "SELECT po_line_no, delivered_qty FROM delivery_confirmation_lines WHERE dc_id=$1", id)
	var lines []struct {
		POLineNo int
		Qty      float64
	}
	for rows.Next() {
		var l struct {
			POLineNo int
			Qty      float64
		}
		rows.Scan(&l.POLineNo, &l.Qty)
		lines = append(lines, l)
	}
	rows.Close()

	for _, l := range lines {
		tx.Exec(ctx, "UPDATE po_delivery_schedule SET gr_qty = gr_qty - $1 WHERE po_id=$2 AND item_no=$3", l.Qty, poID, l.POLineNo)

		// Reverse supply pact releases
		tx.Exec(ctx, `
			UPDATE supply_pact_lines spl
			SET released_qty = spl.released_qty - $1
			FROM supply_pact_releases spr
			WHERE spr.po_id = $2 AND spl.pact_id = spr.pact_id AND spl.line_no = spr.pact_line_no
		`, l.Qty, poID)
	}

	_, err = tx.Exec(ctx, "UPDATE delivery_confirmations SET status='REVERSED', reversed_by=$1, reversed_at=NOW(), reversal_reason=$2 WHERE id=$3", c.GetString("username"), req.Reason, id)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "ReverseDC", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	tx.Commit(ctx)
	c.JSON(200, gin.H{"message": "Reversed successfully"})
}

// -----------------------------------------------------------------------------
// INVOICE MATCHING
// -----------------------------------------------------------------------------

func (h *DeliveryHandler) ListInvoices(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil {
			limit = n
		}
	}

	query := `
		SELECT i.id, i.invoice_number, i.supplier_invoice_ref, i.supplier_id, i.po_id, i.dc_id,
		       i.invoice_date, i.due_date, i.total_amount, i.currency, i.status, i.match_status,
		       s.name as supplier_name, po.po_number, dc.dc_number
		FROM supplier_invoices i
		JOIN suppliers s ON s.id = i.supplier_id
		LEFT JOIN purchase_orders po ON po.id = i.po_id
		LEFT JOIN delivery_confirmations dc ON dc.id = i.dc_id
		WHERE 1=1
	`
	args := []interface{}{}
	argN := 1

	if supID := c.Query("supplier_id"); supID != "" {
		query += fmt.Sprintf(" AND i.supplier_id = $%d", argN)
		args = append(args, supID)
		argN++
	}
	if status := c.Query("status"); status != "" {
		query += fmt.Sprintf(" AND i.status = $%d", argN)
		args = append(args, status)
		argN++
	}
	if poID := c.Query("po_id"); poID != "" {
		query += fmt.Sprintf(" AND i.po_id = $%d", argN)
		args = append(args, poID)
		argN++
	}

	query += fmt.Sprintf(" ORDER BY i.created_at DESC LIMIT $%d", argN)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "ListInvoices", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Inv struct {
		ID                 int64   `json:"id"`
		InvoiceNumber      string  `json:"invoice_number"`
		SupplierInvoiceRef *string `json:"supplier_invoice_ref"`
		SupplierID         int64   `json:"supplier_id"`
		SupplierName       string  `json:"supplier_name"`
		POID               *int64  `json:"po_id"`
		PONumber           *string `json:"po_number"`
		DCID               *int64  `json:"dc_id"`
		DCNumber           *string `json:"dc_number"`
		InvoiceDate        string  `json:"invoice_date"`
		DueDate            *string `json:"due_date"`
		TotalAmount        float64 `json:"total_amount"`
		Currency           string  `json:"currency"`
		Status             string  `json:"status"`
		MatchStatus        string  `json:"match_status"`
	}
	var invs []Inv
	for rows.Next() {
		var i Inv
		var iDate time.Time
		var dDate *time.Time
		rows.Scan(&i.ID, &i.InvoiceNumber, &i.SupplierInvoiceRef, &i.SupplierID, &i.POID, &i.DCID,
			&iDate, &dDate, &i.TotalAmount, &i.Currency, &i.Status, &i.MatchStatus,
			&i.SupplierName, &i.PONumber, &i.DCNumber)
		i.InvoiceDate = iDate.Format("2006-01-02")
		if dDate != nil {
			d := dDate.Format("2006-01-02")
			i.DueDate = &d
		}
		invs = append(invs, i)
	}

	c.JSON(200, gin.H{"supplier_invoices": invs})
}

func (h *DeliveryHandler) CreateInvoice(c *gin.Context) {
	var req struct {
		SupplierInvoiceRef string `json:"supplier_invoice_ref"`
		SupplierID         int64  `json:"supplier_id"`
		POID               *int64 `json:"po_id"`
		DCID               *int64 `json:"dc_id"`
		InvoiceDate        string `json:"invoice_date"`
		DueDate            string `json:"due_date"`
		Currency           string `json:"currency"`
		Notes              string `json:"notes"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var count int
	tx.QueryRow(ctx, "SELECT COUNT(*) FROM supplier_invoices WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())").Scan(&count)
	invNumber := fmt.Sprintf("INV-%d-%05d", time.Now().Year(), count+1)

	var invID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO supplier_invoices (invoice_number, supplier_invoice_ref, supplier_id, po_id, dc_id, invoice_date, due_date, currency, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
	`, invNumber, req.SupplierInvoiceRef, req.SupplierID, req.POID, req.DCID, req.InvoiceDate, req.DueDate, req.Currency, req.Notes, c.GetString("username")).Scan(&invID)
	if err != nil {
		logger.LogError("DB", "DeliveryHandler", "CreateInvoice", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	tx.Commit(ctx)
	c.JSON(201, gin.H{"id": invID, "invoice_number": invNumber})
}

func (h *DeliveryHandler) UpsertInvoiceLines(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Lines []struct {
			LineNo      int     `json:"line_no"`
			Description string  `json:"description"`
			Quantity    float64 `json:"quantity"`
			UnitPrice   float64 `json:"unit_price"`
			POLineNo    *int    `json:"po_line_no"`
			DCLineNo    *int    `json:"dc_line_no"`
		} `json:"lines"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	// Fetch invoice details
	var poID, dcID *int64
	tx.QueryRow(ctx, "SELECT po_id, dc_id FROM supplier_invoices WHERE id=$1 FOR UPDATE", id).Scan(&poID, &dcID)

	tx.Exec(ctx, "DELETE FROM supplier_invoice_lines WHERE invoice_id=$1", id)

	subtotal := 0.0
	matchResultText := ""
	allMatched := true
	anyException := false

	for _, l := range req.Lines {
		lineTotal := l.Quantity * l.UnitPrice
		subtotal += lineTotal

		variance := 0.0
		lineMatchStatus := "UNMATCHED"

		if l.POLineNo != nil && poID != nil {
			var poPrice float64
			err := tx.QueryRow(ctx, "SELECT unit_price FROM purchase_order_lines WHERE po_id=$1 AND line_no=$2", poID, l.POLineNo).Scan(&poPrice)
			if err == nil {
				var dcQty float64
				if dcID != nil {
					tx.QueryRow(ctx, "SELECT COALESCE(accepted_qty, delivered_qty) FROM delivery_confirmation_lines WHERE dc_id=$1 AND po_line_no=$2", dcID, l.POLineNo).Scan(&dcQty)
				}
				
				variance = (l.UnitPrice - poPrice) * l.Quantity
				
				qtyMatch := true
				if dcID != nil && l.Quantity != dcQty {
					qtyMatch = false
				}

				if variance == 0 && qtyMatch {
					lineMatchStatus = "MATCHED"
				} else {
					lineMatchStatus = "EXCEPTION"
					anyException = true
					allMatched = false
					if !qtyMatch {
						matchResultText += fmt.Sprintf("Line %d: Invoice qty %.2f differs from received %.2f. ", l.LineNo, l.Quantity, dcQty)
					}
					if variance != 0 {
						matchResultText += fmt.Sprintf("Line %d: Invoice price %.2f vs PO price %.2f (var: %.2f). ", l.LineNo, l.UnitPrice, poPrice, variance)
					}
				}
			}
		} else {
			allMatched = false
		}

		tx.Exec(ctx, `
			INSERT INTO supplier_invoice_lines 
			(invoice_id, line_no, description, quantity, unit_price, line_total, po_line_no, dc_line_no, match_variance, match_status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, id, l.LineNo, l.Description, l.Quantity, l.UnitPrice, lineTotal, l.POLineNo, l.DCLineNo, variance, lineMatchStatus)
	}

	overallMatchStatus := "UNMATCHED"
	if len(req.Lines) > 0 {
		if allMatched {
			overallMatchStatus = "MATCHED"
			matchResultText = "All lines matched perfectly."
		} else if anyException {
			overallMatchStatus = "EXCEPTION"
		} else {
			overallMatchStatus = "PARTIAL_MATCH"
		}
	}

	tx.Exec(ctx, "UPDATE supplier_invoices SET subtotal=$1, total_amount=$1, match_status=$2, match_result=$3 WHERE id=$4", subtotal, overallMatchStatus, matchResultText, id)

	tx.Commit(ctx)
	c.JSON(200, gin.H{"message": "Lines updated and matched", "match_status": overallMatchStatus})
}

func (h *DeliveryHandler) ApproveInvoice(c *gin.Context) {
	id := c.Param("id")

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var status, matchStatus string
	tx.QueryRow(ctx, "SELECT status, match_status FROM supplier_invoices WHERE id=$1", id).Scan(&status, &matchStatus)
	
	role := c.GetString("role")
	if matchStatus != "MATCHED" && role != "ADMIN" {
		c.JSON(403, gin.H{"error": "Only ADMIN can approve mismatched invoices"})
		return
	}

	tx.Exec(ctx, "UPDATE supplier_invoices SET status='APPROVED', approved_by=$1, approved_at=NOW() WHERE id=$2", c.GetString("username"), id)
	logger.LogInfo("INVOICE", "ApproveInvoice", fmt.Sprintf("Invoice %s approved", id))
	
	tx.Commit(ctx)
	c.JSON(200, gin.H{"message": "Approved"})
}

func (h *DeliveryHandler) RejectInvoice(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Reason string `json:"reason"`
	}
	c.BindJSON(&req)

	h.Pool.Exec(c.Request.Context(), "UPDATE supplier_invoices SET status='REJECTED', notes=notes || '\nReject Reason: ' || $1 WHERE id=$2", req.Reason, id)
	c.JSON(200, gin.H{"message": "Rejected"})
}

func (h *DeliveryHandler) GetMatchReport(c *gin.Context) {
	id := c.Param("id")

	var i struct {
		ID                 int64   `json:"id"`
		InvoiceNumber      string  `json:"invoice_number"`
		SupplierInvoiceRef *string `json:"supplier_invoice_ref"`
		Status             string  `json:"status"`
		MatchStatus        string  `json:"match_status"`
		MatchResult        *string `json:"match_result"`
		POID               *int64  `json:"po_id"`
		DCID               *int64  `json:"dc_id"`
		TotalAmount        float64 `json:"total_amount"`
	}
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT id, invoice_number, supplier_invoice_ref, status, match_status, match_result, po_id, dc_id, total_amount
		FROM supplier_invoices WHERE id=$1
	`, id).Scan(&i.ID, &i.InvoiceNumber, &i.SupplierInvoiceRef, &i.Status, &i.MatchStatus, &i.MatchResult, &i.POID, &i.DCID, &i.TotalAmount)
	
	if err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}

	var po map[string]interface{}
	poValue := 0.0
	if i.POID != nil {
		var poNumber string
		h.Pool.QueryRow(c.Request.Context(), "SELECT po_number, total_value FROM purchase_orders WHERE id=$1", i.POID).Scan(&poNumber, &poValue)
		po = map[string]interface{}{
			"po_number": poNumber,
			"lines": []interface{}{},
		}
	}

	var dc map[string]interface{}
	dcValue := 0.0
	if i.DCID != nil {
		var dcNumber string
		h.Pool.QueryRow(c.Request.Context(), "SELECT dc_number, total_value FROM delivery_confirmations WHERE id=$1", i.DCID).Scan(&dcNumber, &dcValue)
		dc = map[string]interface{}{
			"dc_number": dcNumber,
			"lines": []interface{}{},
		}
	}

	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT il.line_no, il.description, il.quantity, il.unit_price, il.match_variance, il.match_status,
		       pl.unit_price, dl.accepted_qty
		FROM supplier_invoice_lines il
		LEFT JOIN purchase_order_lines pl ON pl.po_id = $2 AND pl.line_no = il.po_line_no
		LEFT JOIN delivery_confirmation_lines dl ON dl.dc_id = $3 AND dl.po_line_no = il.po_line_no
		WHERE il.invoice_id = $1 ORDER BY il.line_no
	`, id, i.POID, i.DCID)
	defer rows.Close()

	var matchLines []map[string]interface{}
	totalVar := 0.0
	for rows.Next() {
		var lNo int
		var desc string
		var invQty, invPrice, variance float64
		var status string
		var poPrice, dcQty *float64
		
		rows.Scan(&lNo, &desc, &invQty, &invPrice, &variance, &status, &poPrice, &dcQty)
		totalVar += variance
		
		msg := "Matched"
		if status == "EXCEPTION" {
			msg = "Discrepancy found"
		}

		line := map[string]interface{}{
			"line_no": lNo,
			"description": desc,
			"po_qty": nil, // In full implementation this would query from PO line 
			"po_price": poPrice,
			"delivered_qty": dcQty,
			"accepted_qty": dcQty,
			"invoice_qty": invQty,
			"invoice_price": invPrice,
			"qty_match": dcQty != nil && *dcQty == invQty,
			"price_match": poPrice != nil && *poPrice == invPrice,
			"variance": variance,
			"status": status,
			"message": msg,
		}
		matchLines = append(matchLines, line)
	}

	summary := map[string]interface{}{
		"total_po_value": poValue,
		"total_delivered_value": dcValue,
		"total_invoice_value": i.TotalAmount,
		"total_variance": totalVar,
		"match_status": i.MatchStatus,
	}

	c.JSON(200, gin.H{
		"invoice": i,
		"po": po,
		"delivery": dc,
		"match_lines": matchLines,
		"summary": summary,
	})
}
