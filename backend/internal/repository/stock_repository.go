package repository

import (
	"context"
	"fmt"
	"time"

	"supplyxerp/backend/internal/db/dbgen"
	"github.com/jackc/pgx/v5/pgtype"
)

type StockRepository struct {
	db DBTX
}

type HULineageNode struct {
	ID            int64              `json:"id"`
	HUCode        string             `json:"hu_code"`
	ParentHUID    *int64             `json:"parent_hu_id"`
	ProductID     int64              `json:"product_id"`
	ProductCode   string             `json:"product_code"`
	ProductName   string             `json:"product_name"`
	Quantity      float64            `json:"quantity"`
	BaseUnit      string             `json:"base_unit"`
	Status        string             `json:"status"`
	ZoneCode      string             `json:"zone_code"`
	ZoneType      string             `json:"zone_type"`
	LabelVersion  int                `json:"label_version"`
	CreatedAt     pgtype.Timestamptz `json:"created_at"`
	Depth         int                `json:"depth"`
}

func (r *StockRepository) GetHULineage(ctx context.Context, tenantID int64, huCode string) ([]HULineageNode, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			id, hu_code, parent_hu_id, product_id, product_code, product_name,
			quantity, base_unit, status, zone_code, zone_type,
			label_version, created_at, depth
		FROM v_hu_lineage
		WHERE path @> (SELECT ARRAY[id] FROM handling_units WHERE hu_code = $1 AND tenant_id = $2)
		   OR path <@ (SELECT ARRAY[id] FROM handling_units WHERE hu_code = $1 AND tenant_id = $2)
		ORDER BY depth ASC, created_at ASC
	`, huCode, tenantID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []HULineageNode
	for rows.Next() {
		var n HULineageNode
		if err := rows.Scan(
			&n.ID, &n.HUCode, &n.ParentHUID, &n.ProductID, &n.ProductCode, &n.ProductName,
			&n.Quantity, &n.BaseUnit, &n.Status, &n.ZoneCode, &n.ZoneType,
			&n.LabelVersion, &n.CreatedAt, &n.Depth,
		); err == nil {
			nodes = append(nodes, n)
		}
	}
	return nodes, nil
}

type StockOverview struct {
	TotalProductsWithStock int64     `json:"total_products_with_stock"`
	TotalHUCount           int64     `json:"total_hu_count"`
	TotalZonesOccupied     int64     `json:"total_zones_occupied"`
	LastMovementAt         pgtype.Timestamptz `json:"last_movement_at"`
}

type ProductStockSummary struct {
	ProductID       int64   `json:"product_id"`
	ProductCode     string  `json:"product_code"`
	ProductName     string  `json:"product_name"`
	BaseUnit        string  `json:"base_unit"`
	TotalQuantity   float64 `json:"total_quantity"`
	TotalHUCount    int64   `json:"total_hu_count"`
	ZoneCount       int64   `json:"zone_count"`
	LastMovementAt  pgtype.Timestamptz `json:"last_movement_at"`
}

type ZoneStock struct {
	ZoneID       int64   `json:"zone_id"`
	ZoneCode     string  `json:"zone_code"`
	ZoneName     string  `json:"zone_name"`
	ZoneType     string  `json:"zone_type"`
	SiteID       int64   `json:"site_id"`
	SiteCode     string  `json:"site_code"`
	ProductCount int64   `json:"product_count"`
	HUCount      int64   `json:"hu_count"`
	TotalQuantity float64 `json:"total_quantity"`
	Products     []byte  `json:"products"` // JSONB from view
}

type MovementEvent struct {
	HuID          int64              `json:"hu_id"`
	HuCode        string             `json:"hu_code"`
	EventType     string             `json:"event_type"`
	Quantity      float64            `json:"quantity"`
	BaseUnit      string             `json:"base_unit"`
	ProductID     int64              `json:"product_id"`
	ProductCode   *string            `json:"product_code"`
	ProductName   *string            `json:"product_name"`
	ZoneCode      *string            `json:"zone_code"`
	ZoneType      *string            `json:"zone_type"`
	SiteCode      *string            `json:"site_code"`
	ReferenceType *string            `json:"reference_type"`
	ReferenceID   *string            `json:"reference_id"`
	CreatedAt     pgtype.Timestamptz `json:"created_at"`
	CreatedBy     int64              `json:"created_by"`
}

func (r *StockRepository) GetOverview(ctx context.Context, tenantID int64) (StockOverview, error) {
	var overview StockOverview
	err := r.db.QueryRow(ctx, `
		SELECT 
			COUNT(DISTINCT product_id),
			SUM(hu_count),
			COUNT(DISTINCT zone_id),
			MAX(last_movement_at)
		FROM v_stock_on_hand
		WHERE tenant_id = $1
	`, tenantID).Scan(&overview.TotalProductsWithStock, &overview.TotalHUCount, &overview.TotalZonesOccupied, &overview.LastMovementAt)
	return overview, err
}

func (r *StockRepository) ListProducts(ctx context.Context, tenantID int64, search string, limit, offset int32) ([]ProductStockSummary, int64, error) {
	where := "WHERE tenant_id = $1"
	args := []any{tenantID}
	
	if search != "" {
		where += " AND (product_code ILIKE $2 OR product_name ILIKE $2)"
		args = append(args, "%"+search+"%")
	}

	argCount := len(args)
	query := fmt.Sprintf(`
		SELECT product_id, product_code, product_name, base_unit, total_quantity, total_hu_count, zone_count, last_movement_at
		FROM v_product_stock_summary
		%s
		ORDER BY product_code ASC
		LIMIT $%d OFFSET $%d
	`, where, argCount+1, argCount+2)
	
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var products []ProductStockSummary
	for rows.Next() {
		var p ProductStockSummary
		if err := rows.Scan(&p.ProductID, &p.ProductCode, &p.ProductName, &p.BaseUnit, &p.TotalQuantity, &p.TotalHUCount, &p.ZoneCount, &p.LastMovementAt); err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}

	var count int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM v_product_stock_summary %s", where)
	err = r.db.QueryRow(ctx, countQuery, args[:argCount]...).Scan(&count)
	
	return products, count, err
}

func (r *StockRepository) GetProductDetail(ctx context.Context, tenantID int64, productID int64) (map[string]any, error) {
	// 1. Get Summary
	var summary ProductStockSummary
	err := r.db.QueryRow(ctx, `
		SELECT product_id, product_code, product_name, base_unit, total_quantity, total_hu_count, zone_count, last_movement_at
		FROM v_product_stock_summary
		WHERE tenant_id = $1 AND product_id = $2
	`, tenantID, productID).Scan(&summary.ProductID, &summary.ProductCode, &summary.ProductName, &summary.BaseUnit, &summary.TotalQuantity, &summary.TotalHUCount, &summary.ZoneCount, &summary.LastMovementAt)
	
	if err != nil {
		return nil, err
	}

	// 2. Get Zone Breakdown
	rows, err := r.db.Query(ctx, `
		SELECT zone_code, zone_name, zone_type, quantity_on_hand, hu_count
		FROM v_stock_on_hand
		WHERE tenant_id = $1 AND product_id = $2
	`, tenantID, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var zones []map[string]any
	for rows.Next() {
		var code, name, ztype string
		var qty float64
		var hus int64
		if err := rows.Scan(&code, &name, &ztype, &qty, &hus); err == nil {
			zones = append(zones, map[string]any{
				"zone_code": code,
				"zone_name": name,
				"zone_type": ztype,
				"quantity":  qty,
				"hu_count":  hus,
			})
		}
	}

	// 3. Get HU List (last movement per HU)
	huRows, err := r.db.Query(ctx, `
		SELECT hu_id, hu_code, quantity, zone_code, event_type, created_at
		FROM (
			SELECT hu_id, hu_code, quantity, zone_code, event_type, created_at,
			       ROW_NUMBER() OVER(PARTITION BY hu_id ORDER BY created_at DESC) as rn
			FROM v_hu_movement_history
			WHERE tenant_id = $1 AND hu_id IN (SELECT id FROM handling_units WHERE product_id = $2 AND status = 'IN_STOCK')
		) t
		WHERE rn = 1
	`, tenantID, productID)
	if err != nil {
		return nil, err
	}
	defer huRows.Close()

	var hus []map[string]any
	for huRows.Next() {
		var hID int64
		var code, zcode, etype string
		var qty float64
		var cat pgtype.Timestamptz
		if err := huRows.Scan(&hID, &code, &qty, &zcode, &etype, &cat); err == nil {
			hus = append(hus, map[string]any{
				"hu_id":           hID,
				"hu_code":         code,
				"quantity":        qty,
				"zone_code":       zcode,
				"last_event_type": etype,
				"last_event_at":   cat,
			})
		}
	}

	return map[string]any{
		"product":        summary,
		"zone_breakdown": zones,
		"hu_list":        hus,
	}, nil
}

func (r *StockRepository) ListZones(ctx context.Context, tenantID int64) ([]ZoneStock, error) {
	rows, err := r.db.Query(ctx, `
		SELECT zone_id, zone_code, zone_name, zone_type, site_id, site_code, product_count, hu_count, total_quantity, products
		FROM v_zone_stock
		WHERE tenant_id = $1
		ORDER BY site_code, zone_code
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var zones []ZoneStock
	for rows.Next() {
		var z ZoneStock
		if err := rows.Scan(&z.ZoneID, &z.ZoneCode, &z.ZoneName, &z.ZoneType, &z.SiteID, &z.SiteCode, &z.ProductCount, &z.HUCount, &z.TotalQuantity, &z.Products); err != nil {
			return nil, err
		}
		zones = append(zones, z)
	}
	return zones, nil
}

func (r *StockRepository) ListMovements(ctx context.Context, tenantID int64, productID int64, zoneID int64, eventType string, page int32) ([]MovementEvent, error) {
	limit := int32(50)
	offset := (page - 1) * limit
	
	where := "WHERE v.tenant_id = $1"
	args := []any{tenantID}
	
	if productID > 0 {
		where += fmt.Sprintf(" AND hu.product_id = $%d", len(args)+1)
		args = append(args, productID)
	}
	if zoneID > 0 {
		where += fmt.Sprintf(" AND v.zone_id = $%d", len(args)+1)
		args = append(args, zoneID)
	}
	if eventType != "" && eventType != "ALL" {
		where += fmt.Sprintf(" AND v.event_type = $%d", len(args)+1)
		args = append(args, eventType)
	}

	query := fmt.Sprintf(`
		SELECT v.hu_id, v.hu_code, v.event_type, v.quantity, v.base_unit, hu.product_id, p.code, p.name, v.zone_code, v.zone_type, v.site_code, v.reference_type, v.reference_id, v.created_at, v.created_by
		FROM v_hu_movement_history v
		JOIN handling_units hu ON hu.id = v.hu_id
		JOIN products p ON p.id = hu.product_id
		%s
		ORDER BY v.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)
	
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []MovementEvent
	for rows.Next() {
		var e MovementEvent
		if err := rows.Scan(&e.HuID, &e.HuCode, &e.EventType, &e.Quantity, &e.BaseUnit, &e.ProductID, &e.ProductCode, &e.ProductName, &e.ZoneCode, &e.ZoneType, &e.SiteCode, &e.ReferenceType, &e.ReferenceID, &e.CreatedAt, &e.CreatedBy); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}

func (r *StockRepository) GetAlerts(ctx context.Context, tenantID int64) ([]map[string]any, error) {
	var alerts []map[string]any

	// 1. Zero Stock Products (were in stock, now depleted)
	// We check for products that have movements but current total_quantity is NULL/0 in summary
	rows, err := r.db.Query(ctx, `
		SELECT p.code, p.name, MAX(ie.created_at) as last_seen
		FROM products p
		JOIN inventory_events ie ON ie.product_id = p.id
		LEFT JOIN v_product_stock_summary s ON s.product_id = p.id AND s.tenant_id = p.tenant_id
		WHERE p.tenant_id = $1 AND (s.total_quantity IS NULL OR s.total_quantity = 0)
		GROUP BY p.id, p.code, p.name
		HAVING MAX(ie.created_at) > NOW() - INTERVAL '30 days'
		LIMIT 10
	`, tenantID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var code, name string
			var lastSeen pgtype.Timestamptz
			if err := rows.Scan(&code, &name, &lastSeen); err == nil {
				alerts = append(alerts, map[string]any{
					"type":         "ZERO_STOCK",
					"product_code": code,
					"product_name": name,
					"last_seen":    lastSeen,
					"severity":     "amber",
				})
			}
		}
	}

	// 2. Stuck in Receiving (> 24h since last event)
	recvRows, err := r.db.Query(ctx, `
		SELECT hu.code, p.code, p.name, hu.quantity, p.base_unit, z.code, MAX(ie.created_at) as last_ev
		FROM handling_units hu
		JOIN products p ON p.id = hu.product_id
		JOIN zones z ON z.id = hu.zone_id
		JOIN inventory_events ie ON ie.hu_id = hu.id
		WHERE hu.tenant_id = $1 AND z.zone_type = 'RECEIVING' AND hu.status = 'IN_STOCK'
		GROUP BY hu.id, hu.code, p.code, p.name, hu.quantity, p.base_unit, z.code
		HAVING MAX(ie.created_at) < NOW() - INTERVAL '24 hours'
	`, tenantID)
	if err == nil {
		defer recvRows.Close()
		for recvRows.Next() {
			var hCode, pCode, pName, zCode string
			var qty float64
			var unit string
			var lastEv pgtype.Timestamptz
			if err := recvRows.Scan(&hCode, &pCode, &pName, &qty, &unit, &zCode, &lastEv); err == nil {
				alerts = append(alerts, map[string]any{
					"type":         "STUCK_RECEIVING",
					"hu_code":      hCode,
					"product_code": pCode,
					"product_name": pName,
					"quantity":     qty,
					"unit":         unit,
					"zone_code":    zCode,
					"last_event":   lastEv,
					"severity":     "red",
				})
			}
		}
	}

	// 3. Blocked in QC (> 48h)
	qcRows, err := r.db.Query(ctx, `
		SELECT hu.code, p.code, p.name, hu.quantity, z.code, MAX(ie.created_at)
		FROM handling_units hu
		JOIN products p ON p.id = hu.product_id
		JOIN zones z ON z.id = hu.zone_id
		JOIN inventory_events ie ON ie.hu_id = hu.id
		WHERE hu.tenant_id = $1 AND z.zone_type = 'QC' AND hu.status = 'IN_STOCK'
		GROUP BY hu.id, hu.code, p.code, p.name, hu.quantity, z.code
		HAVING MAX(ie.created_at) < NOW() - INTERVAL '48 hours'
	`, tenantID)
	if err == nil {
		defer qcRows.Close()
		for qcRows.Next() {
			var hCode, pCode, pName, zCode string
			var qty float64
			var lastEv pgtype.Timestamptz
			if err := qcRows.Scan(&hCode, &pCode, &pName, &qty, &zCode, &lastEv); err == nil {
				alerts = append(alerts, map[string]any{
					"type":         "BLOCKED_QC",
					"hu_code":      hCode,
					"product_code": pCode,
					"product_name": pName,
					"quantity":     qty,
					"zone_code":    zCode,
					"last_event":   lastEv,
					"severity":     "amber",
				})
			}
		}
	}

	return alerts, nil
}

func (r *StockRepository) GenerateSANumber(ctx context.Context, tenantID int64) (string, error) {
	var seq int64
	err := r.db.QueryRow(ctx, "SELECT get_next_sequence($1, 'SA')", tenantID).Scan(&seq)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("SA-%s-%05d", time.Now().Format("2006"), seq), nil
}

func (r *StockRepository) CreateAdjustment(ctx context.Context, arg dbgen.StockAdjustment) (dbgen.StockAdjustment, error) {
	var sa dbgen.StockAdjustment
	err := r.db.QueryRow(ctx, `
		INSERT INTO stock_adjustments (
			tenant_id, sa_number, document_date, posting_date, adjustment_type,
			hu_id, product_id, zone_id, site_id, system_quantity,
			physical_count, quantity_difference, unit, reason_code,
			reason_text, counted_by, posted_by, inventory_event_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		) RETURNING id, public_id, tenant_id, sa_number, created_at
	`, arg.TenantID, arg.SaNumber, arg.DocumentDate, arg.PostingDate, arg.AdjustmentType,
		arg.HuID, arg.ProductID, arg.ZoneID, arg.SiteID, arg.SystemQuantity,
		arg.PhysicalCount, arg.QuantityDifference, arg.Unit, arg.ReasonCode,
		arg.ReasonText, arg.CountedBy, arg.PostedBy, arg.InventoryEventID,
	).Scan(&sa.ID, &sa.PublicID, &sa.TenantID, &sa.SaNumber, &sa.CreatedAt)
	return sa, err
}

func (r *StockRepository) ListAdjustments(ctx context.Context, tenantID int64, limit, offset int) ([]map[string]any, error) {
	rows, err := r.db.Query(ctx, `
		SELECT sa.id, sa.sa_number, sa.posting_date, sa.adjustment_type, 
		       p.code as product_code, z.code as zone_code,
		       sa.quantity_difference, sa.unit, sa.reason_text
		FROM stock_adjustments sa
		JOIN products p ON sa.product_id = p.id
		JOIN zones z ON sa.zone_id = z.id
		WHERE sa.tenant_id = $1
		ORDER BY sa.created_at DESC
		LIMIT $2 OFFSET $3
	`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]any
	for rows.Next() {
		var id int64
		var saNum, adjType, pCode, zCode, unit, reason string
		var diff float64
		var postDate time.Time
		if err := rows.Scan(&id, &saNum, &postDate, &adjType, &pCode, &zCode, &diff, &unit, &reason); err == nil {
			results = append(results, map[string]any{
				"id":           id,
				"sa_number":    saNum,
				"posting_date": postDate,
				"type":         adjType,
				"product_code": pCode,
				"zone_code":    zCode,
				"difference":   diff,
				"unit":         unit,
				"reason":       reason,
			})
		}
	}
	return results, nil
}
