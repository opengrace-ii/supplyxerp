package handlers

import (
	"net/http"

	"supplyxerp/backend/internal/db/dbgen"

	"github.com/gin-gonic/gin"
)

func (h *ConfigHandler) SeedPricingDefaults(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	
	// 1. Check if condition_types already seeded
	var count int
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT COUNT(*) FROM condition_types 
		WHERE tenant_id = $1 AND is_active = true
	`, tenantID).Scan(&count)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check condition types"})
		return
	}

	if count > 0 {
		// Already seeded, return existing
		rows, err := h.Pool.Query(c.Request.Context(), `
			SELECT s.step_number, ct.code, ct.name, ct.condition_class, ct.calculation_type, ct.base_step
			FROM condition_types ct
			JOIN calculation_schema_steps s ON s.condition_type_id = ct.id
			WHERE ct.tenant_id = $1 AND ct.is_active = true
			ORDER BY s.step_number
		`, tenantID)
		
		var types []map[string]any
		if err == nil {
			for rows.Next() {
				var step, base interface{}
				var code, name, class, calc string
				if err := rows.Scan(&step, &code, &name, &class, &calc, &base); err == nil {
					types = append(types, map[string]any{
						"step_number": step,
						"code": code,
						"name": name,
						"condition_class": class,
						"calculation_type": calc,
						"base_step": base,
					})
				}
			}
			rows.Close()
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": map[string]any{
				"already_seeded": true,
				"condition_types_created": 0,
				"condition_types": types,
			},
		})
		return
	}
	
	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tx start error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	// 2. Insert condition types
	_, err = tx.Exec(c.Request.Context(), `
		INSERT INTO condition_types
			(tenant_id, code, name, condition_class, calculation_type,
			plus_minus, base_step, is_active)
		VALUES
			($1,'PRICE','Gross Price',   'PRICE',    'FIXED_AMOUNT','POSITIVE',NULL, true),
			($1,'DISC', 'Trade Discount','DISCOUNT', 'PERCENTAGE',  'NEGATIVE',10, true),
			($1,'FRGT', 'Freight',       'FREIGHT',  'FIXED_AMOUNT','POSITIVE',NULL, true),
			($1,'SRCH', 'Surcharge',     'SURCHARGE','PERCENTAGE',  'POSITIVE',10, true),
			($1,'NET',  'Net Price',     'PRICE',    'FIXED_AMOUNT','POSITIVE',NULL, true),
			($1,'TAX',  'Tax (GST/VAT)', 'TAX',      'PERCENTAGE',  'POSITIVE',50, true),
			($1,'TOTAL','Gross Value',   'PRICE',    'FIXED_AMOUNT','POSITIVE',NULL, true)
		ON CONFLICT DO NOTHING
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed condition types"})
		return
	}

	// 3. Insert schema
	_, err = tx.Exec(c.Request.Context(), `
		INSERT INTO calculation_schemas
			(tenant_id, code, name, document_type, is_default, is_active)
		VALUES ($1,'SXMM01','Standard MM Pricing','PURCHASE_ORDER',true,true)
		ON CONFLICT DO NOTHING
	`, tenantID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed calculation schema"})
		return
	}

	// Also insert schema steps for SXMM01
	tx.Exec(c.Request.Context(), `
		INSERT INTO calculation_schema_steps (tenant_id, schema_id, step_number, condition_type_id, is_statistical, subtotal_flag)
		SELECT $1, s.id, CAST(t.step AS INTEGER), c.id, CAST(t.stat AS BOOLEAN), t.sub
		FROM calculation_schemas s
		CROSS JOIN (
			VALUES 
			(10, 'PRICE', false, NULL),
			(20, 'DISC', false, NULL),
			(30, 'FRGT', false, NULL),
			(40, 'SRCH', false, NULL),
			(50, 'NET', true, 'S1'),
			(60, 'TAX', false, NULL),
			(70, 'TOTAL', true, 'S3')
		) AS t(step, code, stat, sub)
		JOIN condition_types c ON c.code = t.code AND c.tenant_id = $1
		WHERE s.code = 'SXMM01' AND s.tenant_id = $1
		ON CONFLICT DO NOTHING
	`, tenantID)

	// Mark as seeded
	tx.Exec(c.Request.Context(), `
		UPDATE tenant_config 
		SET condition_types_seeded = true, updated_at = now()
		WHERE tenant_id = $1
	`, tenantID)

	tx.Commit(c.Request.Context())

	// Return new data
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]any{
			"already_seeded": false,
			"condition_types_created": 7,
			"schema_created": true,
			"condition_types": []map[string]any{
				{"step_number": 10, "code": "PRICE", "name": "Gross Price"},
				{"step_number": 20, "code": "DISC",  "name": "Trade Discount"},
				{"step_number": 30, "code": "FRGT",  "name": "Freight"},
				{"step_number": 40, "code": "SRCH",  "name": "Surcharge"},
				{"step_number": 50, "code": "NET",   "name": "Net Price"},
				{"step_number": 60, "code": "TAX",   "name": "Tax (GST/VAT)"},
				{"step_number": 70, "code": "TOTAL", "name": "Gross Value"},
			},
		},
	})
}

func (h *ConfigHandler) GetPricingConfig(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	q := dbgen.New(h.Pool)

	cfg, err := q.GetPricingConfig(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "not found"})
		return
	}

	// Fetch condition types
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT s.step_number, ct.code, ct.name, ct.condition_class, ct.calculation_type, ct.base_step
		FROM condition_types ct
		JOIN calculation_schema_steps s ON s.condition_type_id = ct.id
		WHERE ct.tenant_id = $1 AND ct.is_active = true
		ORDER BY s.step_number
	`, tenantID)
	
	var types []map[string]any
	if err == nil {
		for rows.Next() {
			var step, base interface{}
			var code, name, class, calc string
			if err := rows.Scan(&step, &code, &name, &class, &calc, &base); err == nil {
				types = append(types, map[string]any{
					"step_number": step,
					"code": code,
					"name": name,
					"condition_class": class,
					"calculation_type": calc,
					"base_step": base,
				})
			}
		}
		rows.Close()
	}

	pr, _ := cfg.FlatPrThreshold.Float64Value()
	po, _ := cfg.FlatPoThreshold.Float64Value()
	tol, _ := cfg.DefaultTolerancePct.Float64Value()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]any{
			"approval_mode": cfg.ApprovalMode,
			"flat_pr_threshold": pr.Float64,
			"flat_po_threshold": po.Float64,
			"default_tolerance_pct": tol.Float64,
			"default_currency": cfg.DefaultCurrency,
			"condition_types_seeded": len(types) > 0,
			"condition_types_count": len(types),
			"condition_types": types,
		},
	})
}

func (h *ConfigHandler) UpdatePricingConfig(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	q := dbgen.New(h.Pool)

	var req struct {
		ApprovalMode        string  `json:"approval_mode"`
		FlatPrThreshold     float64 `json:"flat_pr_threshold"`
		FlatPoThreshold     float64 `json:"flat_po_threshold"`
		DefaultTolerancePct float64 `json:"default_tolerance_pct"`
		DefaultCurrency     string  `json:"default_currency"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := q.UpdatePricingConfig(c.Request.Context(), dbgen.UpdatePricingConfigParams{
		TenantID:            tenantID,
		ApprovalMode:        req.ApprovalMode,
		FlatPrThreshold:     numericFromFloat(req.FlatPrThreshold),
		FlatPoThreshold:     numericFromFloat(req.FlatPoThreshold),
		DefaultTolerancePct: numericFromFloat(req.DefaultTolerancePct),
		DefaultCurrency:     req.DefaultCurrency,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	cfg, _ := q.GetPricingConfig(c.Request.Context(), tenantID)
	c.JSON(http.StatusOK, cfg)
}
