package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"supplyxerp/backend/internal/db/dbgen"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

func (h *PurchasingHandler) ListSupplierInfoRecords(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idVal := c.Param("public_id")

	q := dbgen.New(h.Pool)

	var supplierID int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM suppliers WHERE tenant_id = $1 AND public_id::text = $2", tenantID, idVal).Scan(&supplierID)
	if err != nil {
		parsed, _ := strconv.ParseInt(idVal, 10, 64)
		supplierID = parsed
	}

	records, err := q.ListSupplierInfoRecords(c.Request.Context(), dbgen.ListSupplierInfoRecordsParams{
		TenantID:   tenantID,
		SupplierID: supplierID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "fetch failed"})
		return
	}

	c.JSON(http.StatusOK, records)
}

func (h *PurchasingHandler) ListAllInfoRecords(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	q := dbgen.New(h.Pool)

	records, err := q.ListAllInfoRecords(c.Request.Context(), dbgen.ListAllInfoRecordsParams{
		TenantID: tenantID,
		ActiveOnly: pgtype.Bool{Bool: true, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "fetch failed"})
		return
	}

	c.JSON(http.StatusOK, records)
}

func (h *PurchasingHandler) CreateInfoRecord(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idVal := c.Param("public_id") // supplier id

	var req struct {
		ProductID               string   `json:"product_id"`
		NetPrice                float64  `json:"net_price"`
		Currency                string   `json:"currency"`
		PerQuantity             float64  `json:"per_quantity"`
		PerUnit                 string   `json:"per_unit"`
		ValidFrom               string   `json:"valid_from"`
		ValidTo                 string   `json:"valid_to"`
		PlannedDeliveryDays     int32    `json:"planned_delivery_days"`
		MinOrderQuantity        *float64 `json:"min_order_quantity"`
		MaxOrderQuantity        *float64 `json:"max_order_quantity"`
		OverDeliveryTolerance   *float64 `json:"over_delivery_tolerance"`
		UnderDeliveryTolerance  *float64 `json:"under_delivery_tolerance"`
		AutoApproveBelow        *float64 `json:"auto_approve_below"`
		RequiresQuotation       bool     `json:"requires_quotation"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var supplierID int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM suppliers WHERE tenant_id = $1 AND public_id::text = $2", tenantID, idVal).Scan(&supplierID)
	if err != nil {
		parsed, _ := strconv.ParseInt(idVal, 10, 64)
		supplierID = parsed
	}

	var productID int64
	err = h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM products WHERE tenant_id = $1 AND public_id::text = $2", tenantID, req.ProductID).Scan(&productID)
	if err != nil {
		parsed, _ := strconv.ParseInt(req.ProductID, 10, 64)
		productID = parsed
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "tx failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())
	qtx := dbgen.New(h.Pool).WithTx(tx)

	formatRow, _ := qtx.GetIRNumberFormat(c.Request.Context(), tenantID)
	seqNum, _ := qtx.GenerateNextInfoRecordSequence(c.Request.Context(), tenantID)

	format := formatRow
	if format == "" {
		format = "IR-{YEAR}-{SEQ}"
	}
	format = strings.ReplaceAll(format, "{YEAR}", time.Now().Format("2006"))
	format = strings.ReplaceAll(format, "{SEQ}", fmt.Sprintf("%05d", seqNum))

	var vFrom, vTo pgtype.Date
	if req.ValidFrom != "" {
		t, _ := time.Parse("2006-01-02", req.ValidFrom)
		vFrom = pgtype.Date{Time: t, Valid: true}
	}
	if req.ValidTo != "" {
		t, _ := time.Parse("2006-01-02", req.ValidTo)
		vTo = pgtype.Date{Time: t, Valid: true}
	}

	var minQty, maxQty, overTol, underTol, approveBelow pgtype.Numeric
	if req.MinOrderQuantity != nil { minQty = numericFromFloat(*req.MinOrderQuantity) }
	if req.MaxOrderQuantity != nil { maxQty = numericFromFloat(*req.MaxOrderQuantity) }
	if req.OverDeliveryTolerance != nil { overTol = numericFromFloat(*req.OverDeliveryTolerance) }
	if req.UnderDeliveryTolerance != nil { underTol = numericFromFloat(*req.UnderDeliveryTolerance) }
	if req.AutoApproveBelow != nil { approveBelow = numericFromFloat(*req.AutoApproveBelow) }

	rec, err := qtx.CreatePurchasingInfoRecord(c.Request.Context(), dbgen.CreatePurchasingInfoRecordParams{
		TenantID:                  tenantID,
		InfoRecordNumber:          format,
		SupplierID:                supplierID,
		ProductID:                 productID,
		PlannedDeliveryTimeDays:   pgtype.Int4{Int32: req.PlannedDeliveryDays, Valid: true},
		MinimumQty:                minQty,
		MaxOrderQuantity:          maxQty,
		OverdeliveryTolerancePct:  overTol,
		UnderdeliveryTolerancePct: underTol,
		AutoApproveBelow:          approveBelow,
		RequiresQuotation:         req.RequiresQuotation,
		NetPrice:                  numericFromFloat(req.NetPrice),
		Currency:                  pgtype.Text{String: req.Currency, Valid: true},
		PerQuantity:               numericFromFloat(req.PerQuantity),
		PerUnit:                   pgtype.Text{String: req.PerUnit, Valid: true},
		ValidFrom:                 vFrom,
		ValidTo:                   vTo,
		IsActive:                  true,
	})

	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create info record"})
		return
	}

	tx.Commit(c.Request.Context())
	c.JSON(http.StatusOK, rec)
}

func (h *PurchasingHandler) DeactivateInfoRecord(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	irID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	// Fetch existing
	// To minimize code length, just run raw update
	_, err := h.Pool.Exec(c.Request.Context(), "UPDATE purchasing_info_records SET is_active = false, updated_at = now() WHERE id = $1 AND tenant_id = $2", irID, tenantID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not deactivate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
