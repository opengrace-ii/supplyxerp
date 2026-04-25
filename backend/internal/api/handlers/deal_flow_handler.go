package handlers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"supplyxerp/backend/internal/db/dbgen"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/google/uuid"
)

type DealFlowHandler struct {
	queries *dbgen.Queries
}

func NewDealFlowHandler(q *dbgen.Queries) *DealFlowHandler {
	return &DealFlowHandler{queries: q}
}

// ── Customers ────────────────────────────────────────────────────────────────

func (h *DealFlowHandler) ListCustomers(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	customers, err := h.queries.ListCustomers(c, tenantID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"data": customers})
}

func (h *DealFlowHandler) CreateCustomer(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		Code         string  `json:"code" binding:"required"`
		Name         string  `json:"name" binding:"required"`
		Email        string  `json:"email"`
		Phone        string  `json:"phone"`
		Address      string  `json:"address"`
		City         string  `json:"city"`
		Country      string  `json:"country"`
		Currency     string  `json:"currency"`
		PaymentTerms string  `json:"payment_terms"`
		CreditLimit  float64 `json:"credit_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	currency := req.Currency
	if currency == "" { currency = "GBP" }
	terms := req.PaymentTerms
	if terms == "" { terms = "NET30" }
	country := req.Country
	if country == "" { country = "GB" }

	customer, err := h.queries.CreateCustomer(c, dbgen.CreateCustomerParams{
		TenantID:     tenantID,
		Code:         req.Code,
		Name:         req.Name,
		Email:        stringToText(req.Email),
		Phone:        stringToText(req.Phone),
		Address:      stringToText(req.Address),
		City:         stringToText(req.City),
		Country:      stringToText(country),
		Currency:     stringToText(currency),
		PaymentTerms: stringToText(terms),
		CreditLimit:  numericFromFloat(req.CreditLimit),
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(201, gin.H{"data": customer})
}

// ── Sales Orders ─────────────────────────────────────────────────────────────

func (h *DealFlowHandler) GetDashboard(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	dash, err := h.queries.GetDealFlowDashboard(c, tenantID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"data": dash})
}

func (h *DealFlowHandler) ListSalesOrders(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	limit  := int32(50)
	offset := int32(0)
	if l, err := strconv.Atoi(c.Query("limit"));  err == nil { limit  = int32(l) }
	if p, err := strconv.Atoi(c.Query("page"));   err == nil { offset = int32(p) * limit }

	orders, err := h.queries.ListSalesOrders(c, dbgen.ListSalesOrdersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"data": orders})
}

func (h *DealFlowHandler) CreateSalesOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID   := c.MustGet("user_id").(int64)

	var req struct {
		CustomerID    int64  `json:"customer_id"   binding:"required"`
		OrderDate     string `json:"order_date"`
		RequestedDate string `json:"requested_date"`
		Currency      string `json:"currency"`
		Notes         string `json:"notes"`
		Lines []struct {
			MaterialID    *int64  `json:"material_id"`
			Description   string  `json:"description"  binding:"required"`
			Quantity      float64 `json:"quantity"     binding:"required,gt=0"`
			UnitOfMeasure string  `json:"unit_of_measure"`
			UnitPrice     float64 `json:"unit_price"   binding:"required,gte=0"`
			DiscountPct   float64 `json:"discount_pct"`
		} `json:"lines" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	currency := req.Currency
	if currency == "" { currency = "GBP" }

	orderDate := time.Now()
	if req.OrderDate != "" {
		if d, err := time.Parse("2006-01-02", req.OrderDate); err == nil {
			orderDate = d
		}
	}
    
    var reqDate pgtype.Date
    if req.RequestedDate != "" {
        if d, err := time.Parse("2006-01-02", req.RequestedDate); err == nil {
			reqDate = pgtype.Date{Time: d, Valid: true}
		}
    }

	so, err := h.queries.CreateSalesOrder(c, dbgen.CreateSalesOrderParams{
		TenantID:      tenantID,
		CustomerID:    req.CustomerID,
		OrderDate:     pgtype.Date{Time: orderDate, Valid: true},
		RequestedDate: reqDate,
		Currency:      stringToText(currency),
		Notes:         stringToText(req.Notes),
		CreatedBy:     int64ToInt8(userID),
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Add lines
	for i, line := range req.Lines {
		uom := line.UnitOfMeasure
		if uom == "" { uom = "EA" }
        
        var matID pgtype.Int8
        if line.MaterialID != nil {
            matID = pgtype.Int8{Int64: *line.MaterialID, Valid: true}
        }
        
		_, err := h.queries.AddSalesOrderLine(c, dbgen.AddSalesOrderLineParams{
			SalesOrderID:  so.ID,
			LineNumber:    int32(i + 1),
			MaterialID:    matID,
			Description:   line.Description,
			Quantity:      numericFromFloat(line.Quantity),
			UnitOfMeasure: uom,
			UnitPrice:     numericFromFloat(line.UnitPrice),
			DiscountPct:   numericFromFloat(line.DiscountPct),
		})
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to add line: " + err.Error()})
			return
		}
	}

	// Re-fetch with totals
	updated, _ := h.queries.GetSalesOrderWithLines(c, dbgen.GetSalesOrderWithLinesParams{
		PublicID: so.PublicID,
		TenantID: tenantID,
	})
	c.JSON(201, gin.H{"data": updated})
}

func (h *DealFlowHandler) GetSalesOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id format"})
        return
    }

	so, err := h.queries.GetSalesOrderWithLines(c, dbgen.GetSalesOrderWithLinesParams{
		PublicID: publicID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(404, gin.H{"error": "sales order not found"})
		return
	}

	lines, err := h.queries.GetSalesOrderLines(c, so.ID)
	if err != nil {
		lines = []dbgen.GetSalesOrderLinesRow{}
	}

	c.JSON(200, gin.H{
		"data":  so,
		"lines": lines,
	})
}

func (h *DealFlowHandler) ConfirmSalesOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID   := c.MustGet("user_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id format"})
        return
    }

	// Get the SO first to get its integer ID
	so, err := h.queries.GetSalesOrderWithLines(c, dbgen.GetSalesOrderWithLinesParams{
		PublicID: publicID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(404, gin.H{"error": "sales order not found"})
		return
	}
	if so.Status != "DRAFT" {
		c.JSON(409, gin.H{"error": "only DRAFT orders can be confirmed"})
		return
	}

	confirmed, err := h.queries.ConfirmSalesOrder(c, dbgen.ConfirmSalesOrderParams{
		ID:       so.ID,
		ConfirmedBy:  int64ToInt8(userID),
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	h.logEvent(c, tenantID, userID, "SO_CONFIRMED", confirmed.SoNumber)

	c.JSON(200, gin.H{
		"data":    confirmed,
		"message": "Sales order " + confirmed.SoNumber + " confirmed",
	})
}

func (h *DealFlowHandler) CancelSalesOrder(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	userID   := c.MustGet("user_id").(int64)
	publicID, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid id format"})
        return
    }

	so, err := h.queries.GetSalesOrderWithLines(c, dbgen.GetSalesOrderWithLinesParams{
		PublicID: publicID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(404, gin.H{"error": "sales order not found"})
		return
	}

	cancelled, err := h.queries.CancelSalesOrder(c, dbgen.CancelSalesOrderParams{
		ID:       so.ID,
		TenantID: tenantID,
	})
	if err != nil {
		c.JSON(409, gin.H{"error": "cannot cancel — order status: " + so.Status})
		return
	}

	h.logEvent(c, tenantID, userID, "SO_CANCELLED", cancelled.SoNumber)
	c.JSON(200, gin.H{"data": cancelled})
}

func (h *DealFlowHandler) logEvent(c *gin.Context, tenantID, userID int64, action, ref string) {
	// Non-blocking audit log — ignore errors
	// _ = h.queries  // use audit log query if available
}
