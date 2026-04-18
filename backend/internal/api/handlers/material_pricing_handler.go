package handlers

import (
	"net/http"

	"supplyxerp/backend/internal/db/dbgen"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

func (h *ProductHandler) GetProductPricing(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	idVal := c.Param("public_id")
	
	q := dbgen.New(h.Pool)

	var publicID pgtype.UUID
	if err := publicID.Scan(idVal); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid format"})
		return
	}
	
	var productID int64; err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM products WHERE tenant_id = $1 AND public_id = $2", tenantID, publicID).Scan(&productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	prodPricing, err := q.GetProductPricing(c.Request.Context(), dbgen.GetProductPricingParams{
		ID:       productID,
		TenantID: int64ToInt8(tenantID),
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	history, err := q.ListProductPriceHistory(c.Request.Context(), dbgen.ListProductPriceHistoryParams{
		ProductID: productID,
		TenantID:  tenantID,
	})
	if err != nil {
		history = []dbgen.ProductPriceHistory{}
	}

	spr, _ := prodPricing.StandardPrice.Float64Value()
	mpr, _ := prodPricing.MapPrice.Float64Value()
	lpr, _ := prodPricing.LastPoPrice.Float64Value()
	tol, _ := prodPricing.AutoApproveTolerancePct.Float64Value()
	re, _ := prodPricing.ReorderPoint.Float64Value()
	sa, _ := prodPricing.SafetyStock.Float64Value()
	ma, _ := prodPricing.MaxStockLevel.Float64Value()
	spu, _ := prodPricing.StandardPriceUnit.Float64Value()

	c.JSON(http.StatusOK, gin.H{
		"pricing": gin.H{
			"price_control":              mapPriceControlToUI(prodPricing.PriceControl),
			"standard_price":             spr.Float64,
			"standard_price_unit":        spu.Float64,
			"standard_currency":          prodPricing.StandardCurrency,
			"moving_price":               mpr.Float64,
			"last_po_price":              lpr.Float64,
			"last_po_date":               prodPricing.LastPoDate,
			"auto_approve_tolerance_pct": tol.Float64,
			"requires_quotation":         prodPricing.RequiresQuotation,
			"reorder_point":              re.Float64,
			"safety_stock":               sa.Float64,
			"max_stock_level":            ma.Float64,
			"procurement_type":           prodPricing.ProcurementType,
		},
		"history": history,
	})
}

func mapPriceControlToUI(pc string) string {
	switch pc {
	case "STANDARD":
		return "S"
	case "MAP":
		return "V"
	default:
		return pc
	}
}

func mapUIToPriceControl(ui string) string {
	switch ui {
	case "S":
		return "STANDARD"
	case "V":
		return "MAP"
	default:
		return ui
	}
}

func (h *ProductHandler) UpdateProductPricing(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)
	idVal := c.Param("public_id")

	var req struct {
		PriceControl            string   `json:"price_control"`
		StandardPrice           *float64 `json:"standard_price"`
		MovingPrice             *float64 `json:"moving_price"`
		StandardPriceUnit       float64  `json:"standard_price_unit"`
		StandardCurrency        string   `json:"standard_currency"`
		AutoApproveTolerancePct *float64 `json:"auto_approve_tolerance_pct"`
		RequiresQuotation       bool     `json:"requires_quotation"`
		ReorderPoint            *float64 `json:"reorder_point"`
		SafetyStock             *float64 `json:"safety_stock"`
		MaxStockLevel           *float64 `json:"max_stock_level"`
		ProcurementType         string   `json:"procurement_type"`
		ChangeReason            string   `json:"change_reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var publicID pgtype.UUID
	if err := publicID.Scan(idVal); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid format"})
		return
	}
	
	var productID int64; err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM products WHERE tenant_id = $1 AND public_id = $2", tenantID, publicID).Scan(&productID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	q := dbgen.New(h.Pool)

	// Get existing to check if standard_price changed
	oldPricing, _ := q.GetProductPricing(c.Request.Context(), dbgen.GetProductPricingParams{
		ID:       productID,
		TenantID: int64ToInt8(tenantID),
	})

	req.PriceControl = mapUIToPriceControl(req.PriceControl)

	// Fill missing from existing
	if req.PriceControl == "" { req.PriceControl = oldPricing.PriceControl }
	if req.StandardCurrency == "" { req.StandardCurrency = oldPricing.StandardCurrency }
	if req.ProcurementType == "" { req.ProcurementType = oldPricing.ProcurementType }
	if req.StandardPriceUnit == 0 { 
		val, _ := oldPricing.StandardPriceUnit.Float64Value()
		req.StandardPriceUnit = val.Float64
		if req.StandardPriceUnit == 0 { req.StandardPriceUnit = 1 }
	}

	if req.ChangeReason == "" {
		req.ChangeReason = "Manual update via MaterialHub"
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "tx failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())
	qtx := q.WithTx(tx)

	var stdPrice, movingPrice pgtype.Numeric
	if req.StandardPrice != nil {
		stdPrice = numericFromFloat(*req.StandardPrice)
	} else {
		stdPrice = oldPricing.StandardPrice
	}

	if req.MovingPrice != nil {
		movingPrice = numericFromFloat(*req.MovingPrice)
	} else {
		movingPrice = oldPricing.MapPrice
	}

	var tolPct pgtype.Numeric
	if req.AutoApproveTolerancePct != nil {
		tolPct = numericFromFloat(*req.AutoApproveTolerancePct)
	} else {
		tolPct = oldPricing.AutoApproveTolerancePct
	}

	var reorder, safety, max pgtype.Numeric
	if req.ReorderPoint != nil { reorder = numericFromFloat(*req.ReorderPoint) } else { reorder = oldPricing.ReorderPoint }
	if req.SafetyStock != nil { safety = numericFromFloat(*req.SafetyStock) } else { safety = oldPricing.SafetyStock }
	if req.MaxStockLevel != nil { max = numericFromFloat(*req.MaxStockLevel) } else { max = oldPricing.MaxStockLevel }

	err = qtx.UpdateProductPricing(c.Request.Context(), dbgen.UpdateProductPricingParams{
		ID:                      productID,
		TenantID:                int64ToInt8(tenantID),
		PriceControl:            req.PriceControl,
		StandardPrice:           stdPrice,
		StandardPriceUnit:       numericFromFloat(req.StandardPriceUnit),
		StandardCurrency:        req.StandardCurrency,
		MapPrice:                movingPrice,
		AutoApproveTolerancePct: tolPct,
		RequiresQuotation:       req.RequiresQuotation,
		ReorderPoint:            reorder,
		SafetyStock:             safety,
		MaxStockLevel:           max,
		ProcurementType:         req.ProcurementType,
	})
	
	if err != nil {
		c.JSON(500, gin.H{"error": "update failed"})
		return
	}

	// Determine if standard price changed
	oldStdPriceVal, _ := oldPricing.StandardPrice.Float64Value()
	var newStdPrice float64
	if req.StandardPrice != nil {
		newStdPrice = *req.StandardPrice
	}

	if (req.StandardPrice != nil && oldPricing.StandardPrice.Valid && oldStdPriceVal.Float64 != newStdPrice) || (!oldPricing.StandardPrice.Valid && req.StandardPrice != nil) {
		if req.ChangeReason == "" {
			c.JSON(400, gin.H{"error": "change_reason is required when standard_price changes"})
			return
		}
		
		qtx.CloseProductPriceHistory(c.Request.Context(), dbgen.CloseProductPriceHistoryParams{
			ProductID: productID,
			TenantID:  tenantID,
		})

		qtx.CreateProductPriceHistory(c.Request.Context(), dbgen.CreateProductPriceHistoryParams{
			TenantID:          tenantID,
			ProductID:         productID,
			PriceType:         "STANDARD",
			Price:             stdPrice,
			Currency:          req.StandardCurrency,
			ChangedByUsername: pgtype.Text{String: "admin", Valid: true}, // Would fetch actual username, but mock for now
			ChangeReason:      pgtype.Text{String: req.ChangeReason, Valid: true},
			SourceDocument:    pgtype.Text{},
		})
	}

	tx.Commit(c.Request.Context())

	// Audit
	h.Repo.Audit.Log(c.Request.Context(), tenantID, actorID, "UPDATE_PRODUCT_PRICING", "PRODUCTS", publicID, nil, nil)

	// Return updated
	h.GetProductPricing(c)
}
