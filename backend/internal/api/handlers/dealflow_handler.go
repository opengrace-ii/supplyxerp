package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/logger"
)

type DealflowHandler struct {
	Pool *pgxpool.Pool
}

// -----------------------------------------------------------------------------
// CUSTOMERS
// -----------------------------------------------------------------------------

func (h *DealflowHandler) ListCustomers(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	query := `SELECT * FROM customers WHERE 1=1`
	args := []any{}
	argIdx := 1

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if search != "" {
		query += fmt.Sprintf(" AND (name ILIKE $%d OR customer_number ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY name LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		logger.LogError("API", "DEALFLOW", "ListCustomers", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers"})
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

	c.JSON(http.StatusOK, gin.H{"customers": results})
}

func (h *DealflowHandler) CreateCustomer(c *gin.Context) {
	var req struct {
		Name         string  `json:"name"`
		Email        string  `json:"email"`
		Phone        string  `json:"phone"`
		AddressLine1 string  `json:"address_line1"`
		AddressLine2 string  `json:"address_line2"`
		City         string  `json:"city"`
		Country      string  `json:"country"`
		PostalCode   string  `json:"postal_code"`
		Currency     string  `json:"currency"`
		PaymentTerms string  `json:"payment_terms"`
		CreditLimit  float64 `json:"credit_limit"`
		Notes        string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	year := time.Now().Year()
	var seq int
	tx.QueryRow(c.Request.Context(), "SELECT COUNT(*) + 1 FROM customers").Scan(&seq)
	custNumber := fmt.Sprintf("CUST-%d-%05d", year, seq)

	if req.Currency == "" { req.Currency = "USD" }

	var id int64
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO customers (customer_number, name, email, phone, address_line1, address_line2, city, country, postal_code, currency, payment_terms, credit_limit, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id
	`, custNumber, req.Name, req.Email, req.Phone, req.AddressLine1, req.AddressLine2, req.City, req.Country, req.PostalCode, req.Currency, req.PaymentTerms, req.CreditLimit, req.Notes).Scan(&id)

	if err != nil {
		logger.LogError("API", "DEALFLOW", "CreateCustomer", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer"})
		return
	}

	tx.Commit(c.Request.Context())
	c.JSON(http.StatusCreated, gin.H{"id": id, "customer_number": custNumber})
}

func (h *DealflowHandler) GetCustomer(c *gin.Context) {
	id := c.Param("id")
	var result map[string]any
	
	// Scan into map using reflection-like values
	rows, _ := h.Pool.Query(c.Request.Context(), "SELECT * FROM customers WHERE id = $1", id)
	defer rows.Close()
	if rows.Next() {
		vals, _ := rows.Values()
		colNames := rows.FieldDescriptions()
		result = make(map[string]any)
		for i, col := range colNames {
			result[string(col.Name)] = vals[i]
		}
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *DealflowHandler) UpdateCustomer(c *gin.Context) {
	id := c.Param("id")
	var req map[string]any
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Dynamic update (simplified for this task)
	query := "UPDATE customers SET "
	args := []any{}
	argIdx := 1
	for k, v := range req {
		if k == "id" || k == "customer_number" || k == "created_at" { continue }
		query += fmt.Sprintf("%s = $%d, ", k, argIdx)
		args = append(args, v)
		argIdx++
	}
	query = query[:len(query)-2] // remove last comma
	query += fmt.Sprintf(" WHERE id = $%d", argIdx)
	args = append(args, id)

	_, err := h.Pool.Exec(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// -----------------------------------------------------------------------------
// DEALS
// -----------------------------------------------------------------------------

func (h *DealflowHandler) ListDeals(c *gin.Context) {
	customerID := c.Query("customer_id")
	status := c.Query("status")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	query := `
		SELECT d.*, c.name as customer_name 
		FROM deals d 
		JOIN customers c ON d.customer_id = c.id 
		WHERE 1=1
	`
	args := []any{}
	argIdx := 1

	if customerID != "" {
		query += fmt.Sprintf(" AND d.customer_id = $%d", argIdx)
		args = append(args, customerID)
		argIdx++
	}
	if status != "" {
		query += fmt.Sprintf(" AND d.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY d.created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch deals"})
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

	c.JSON(http.StatusOK, gin.H{"deals": results})
}

func (h *DealflowHandler) CreateDeal(c *gin.Context) {
	var req struct {
		CustomerID        int64  `json:"customer_id"`
		DealDate          string `json:"deal_date"`
		RequestedDelivery string `json:"requested_delivery"`
		Currency          string `json:"currency"`
		Notes             string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username, _ := c.Get("username")
	userStr := fmt.Sprintf("%v", username)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Tx fail"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	year := time.Now().Year()
	var seq int
	tx.QueryRow(c.Request.Context(), "SELECT COUNT(*) + 1 FROM deals").Scan(&seq)
	dealNumber := fmt.Sprintf("DEAL-%d-%05d", year, seq)

	if req.Currency == "" { req.Currency = "USD" }
	if req.DealDate == "" { req.DealDate = time.Now().Format("2006-01-02") }

	var id int64
	err = tx.QueryRow(c.Request.Context(), `
		INSERT INTO deals (deal_number, customer_id, deal_date, requested_delivery, currency, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
	`, dealNumber, req.CustomerID, req.DealDate, req.RequestedDelivery, req.Currency, req.Notes, userStr).Scan(&id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tx.Commit(c.Request.Context())
	c.JSON(http.StatusCreated, gin.H{"id": id, "deal_number": dealNumber})
}

func (h *DealflowHandler) GetDeal(c *gin.Context) {
	id := c.Param("id")
	
	// Header
	var deal map[string]any
	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT d.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
		FROM deals d JOIN customers c ON d.customer_id = c.id WHERE d.id = $1
	`, id)
	defer rows.Close()
	if rows.Next() {
		vals, _ := rows.Values()
		colNames := rows.FieldDescriptions()
		deal = make(map[string]any)
		for i, col := range colNames {
			deal[string(col.Name)] = vals[i]
		}
	} else {
		c.JSON(404, gin.H{"error": "Deal not found"})
		return
	}
	rows.Close()

	// Lines
	lineRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT dl.*, p.name as material_name, p.code as material_code
		FROM deal_lines dl LEFT JOIN products p ON dl.material_id = p.id
		WHERE dl.deal_id = $1 ORDER BY dl.line_no
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

	c.JSON(200, gin.H{"deal": deal, "lines": lines})
}

func (h *DealflowHandler) UpsertDealLines(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Lines []struct {
			LineNo        int     `json:"line_no"`
			MaterialID    int64   `json:"material_id"`
			Description   string  `json:"description"`
			OrderedQty    float64 `json:"ordered_qty"`
			UnitPrice     float64 `json:"unit_price"`
			DiscountPct   float64 `json:"discount_pct"`
			UOM           string  `json:"unit_of_measure"`
		} `json:"lines"`
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

	// Delete existing lines
	tx.Exec(c.Request.Context(), "DELETE FROM deal_lines WHERE deal_id = $1", id)

	subtotal := 0.0
	for _, l := range req.Lines {
		lineTotal := l.OrderedQty * l.UnitPrice * (1 - l.DiscountPct/100)
		subtotal += lineTotal

		// Check Availability
		var stock float64
		_ = tx.QueryRow(c.Request.Context(), "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM v_stock_on_hand WHERE product_id = $1", l.MaterialID).Scan(&stock)

		status := "UNAVAILABLE"
		availQty := 0.0
		if stock >= l.OrderedQty {
			status = "AVAILABLE"
			availQty = l.OrderedQty
		} else if stock > 0 {
			status = "PARTIAL"
			availQty = stock
		}

		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO deal_lines (deal_id, line_no, material_id, description, ordered_qty, unit_of_measure, unit_price, discount_pct, availability_status, available_qty)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, id, l.LineNo, l.MaterialID, l.Description, l.OrderedQty, l.UOM, l.UnitPrice, l.DiscountPct, status, availQty)
	}

	// Update deal header
	tx.Exec(c.Request.Context(), "UPDATE deals SET subtotal = $1, total_amount = $1 * 1.2, tax_amount = $1 * 0.2, updated_at = NOW() WHERE id = $2", subtotal, id)

	tx.Commit(c.Request.Context())
	c.JSON(200, gin.H{"message": "Lines updated"})
}

func (h *DealflowHandler) ConfirmDeal(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "Tx fail"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var dealNum string
	var custName string
	var total float64
	err = tx.QueryRow(c.Request.Context(), `
		SELECT d.deal_number, c.name, d.total_amount 
		FROM deals d JOIN customers c ON d.customer_id = c.id 
		WHERE d.id = $1
	`, id).Scan(&dealNum, &custName, &total)
	if err != nil {
		c.JSON(404, gin.H{"error": "Not found"})
		return
	}

	// Mark CONFIRMED
	tx.Exec(c.Request.Context(), "UPDATE deals SET status = 'CONFIRMED', updated_at = NOW() WHERE id = $1", id)

	// Create reservations
	rows, _ := tx.Query(c.Request.Context(), "SELECT line_no, material_id, available_qty, ordered_qty FROM deal_lines WHERE deal_id = $1 AND available_qty > 0", id)
	defer rows.Close()
	
	type resLine struct {
		lineNo int
		matID  int64
		qty    float64
		ordered float64
	}
	var resLines []resLine
	for rows.Next() {
		var r resLine
		rows.Scan(&r.lineNo, &r.matID, &r.qty, &r.ordered)
		resLines = append(resLines, r)
	}
	rows.Close()

	for _, rl := range resLines {
		tx.Exec(c.Request.Context(), `
			INSERT INTO stock_reservations (deal_id, deal_line_no, material_id, reserved_qty)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (deal_id, deal_line_no) DO UPDATE SET reserved_qty = $4
		`, id, rl.lineNo, rl.matID, rl.qty)

		tx.Exec(c.Request.Context(), "UPDATE deal_lines SET confirmed_qty = $1 WHERE deal_id = $2 AND line_no = $3", rl.qty, id, rl.lineNo)
	}

	tx.Commit(c.Request.Context())
	logger.LogInfo("DEALFLOW", "ConfirmDeal", fmt.Sprintf("Deal confirmed: number=%s customer=%s total=%f", dealNum, custName, total))
	c.JSON(200, gin.H{"success": true})
}

func (h *DealflowHandler) CancelDeal(c *gin.Context) {
	id := c.Param("id")
	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "Tx fail"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	tx.Exec(c.Request.Context(), "UPDATE deals SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1", id)
	tx.Exec(c.Request.Context(), "UPDATE stock_reservations SET status = 'RELEASED' WHERE deal_id = $1", id)

	tx.Commit(c.Request.Context())
	c.JSON(200, gin.H{"success": true})
}
