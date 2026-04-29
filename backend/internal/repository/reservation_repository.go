package repository

import (
	"context"
	"fmt"
	"time"
)

type ReservationRepository struct {
	db DBTX
}

type StockReservation struct {
	ID                int64      `json:"id"`
	PublicID          string     `json:"public_id"`
	TenantID          int64      `json:"tenant_id"`
	ReservationNumber string     `json:"reservation_number"`
	ProductID         int64      `json:"product_id"`
	ProductCode       string     `json:"product_code"`
	ProductName       string     `json:"product_name"`
	SiteID            int64      `json:"site_id"`
	ZoneID            *int64     `json:"zone_id"`
	Quantity          float64    `json:"quantity"`
	FulfilledQty      float64    `json:"fulfilled_qty"`
	OpenQty           float64    `json:"open_qty"` // computed: quantity - fulfilled_qty
	Unit              string     `json:"unit"`
	MovementType      string     `json:"movement_type"`
	Status            string     `json:"status"`
	ReservedByType    string     `json:"reserved_by_type"`
	ReservedByID      *int64     `json:"reserved_by_id"`
	RequirementDate   *time.Time `json:"requirement_date"`
	ValidUntil        *time.Time `json:"valid_until"`
	Notes             string     `json:"notes"`
	CreatedBy         *int64     `json:"created_by"`
	CreatedAt         time.Time  `json:"created_at"`
}

func (r *ReservationRepository) Create(ctx context.Context, res StockReservation) (int64, error) {
	// Generate reservation number
	var seq int64
	err := r.db.QueryRow(ctx, "SELECT get_next_sequence($1, 'RES')", res.TenantID).Scan(&seq)
	if err != nil {
		return 0, fmt.Errorf("failed to generate reservation sequence: %w", err)
	}

	yearStr := time.Now().Format("2006")
	seqStr := fmt.Sprintf("%05d", seq)
	resNumber := fmt.Sprintf("RES-%s-%s", yearStr, seqStr)

	var id int64
	err = r.db.QueryRow(ctx, `
		INSERT INTO stock_reservations (
			tenant_id, reservation_number, product_id, site_id, zone_id,
			quantity, unit, movement_type, status,
			reserved_by_type, reserved_by_id, requirement_date, valid_until,
			cost_centre, notes, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		) RETURNING id
	`, res.TenantID, resNumber, res.ProductID, res.SiteID, res.ZoneID,
		res.Quantity, res.Unit, res.MovementType, "ACTIVE",
		res.ReservedByType, res.ReservedByID, res.RequirementDate, res.ValidUntil,
		"", res.Notes, res.CreatedBy).Scan(&id)

	return id, err
}

func (r *ReservationRepository) List(ctx context.Context, tenantID int64, status string, limit, offset int) ([]StockReservation, error) {
	where := "WHERE sr.tenant_id = $1"
	args := []any{tenantID}

	if status != "" && status != "ALL" {
		where += fmt.Sprintf(" AND sr.status = $%d", len(args)+1)
		args = append(args, status)
	}

	query := fmt.Sprintf(`
		SELECT sr.id, sr.public_id::text, sr.tenant_id, sr.reservation_number,
		       sr.product_id, p.code, p.name,
		       sr.site_id, sr.zone_id, sr.quantity, sr.fulfilled_qty,
		       (sr.quantity - sr.fulfilled_qty) AS open_qty,
		       sr.unit, sr.movement_type, sr.status,
		       sr.reserved_by_type, sr.reserved_by_id,
		       sr.requirement_date, sr.valid_until,
		       COALESCE(sr.notes, ''), sr.created_by, sr.created_at
		FROM stock_reservations sr
		JOIN products p ON sr.product_id = p.id
		%s
		ORDER BY sr.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reservations []StockReservation
	for rows.Next() {
		var res StockReservation
		if err := rows.Scan(
			&res.ID, &res.PublicID, &res.TenantID, &res.ReservationNumber,
			&res.ProductID, &res.ProductCode, &res.ProductName,
			&res.SiteID, &res.ZoneID, &res.Quantity, &res.FulfilledQty,
			&res.OpenQty, &res.Unit, &res.MovementType, &res.Status,
			&res.ReservedByType, &res.ReservedByID,
			&res.RequirementDate, &res.ValidUntil,
			&res.Notes, &res.CreatedBy, &res.CreatedAt,
		); err == nil {
			reservations = append(reservations, res)
		}
	}
	return reservations, nil
}

func (r *ReservationRepository) Cancel(ctx context.Context, tenantID int64, reservationID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE stock_reservations 
		SET status = 'CANCELLED', updated_at = now() 
		WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
	`, reservationID, tenantID)
	return err
}

// Consume fulfils some or all of a reservation (called when GI is posted)
func (r *ReservationRepository) Consume(ctx context.Context, tenantID int64, reservationID int64, quantity float64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE stock_reservations 
		SET fulfilled_qty = fulfilled_qty + $3,
		    status = CASE 
		      WHEN fulfilled_qty + $3 >= quantity THEN 'FULFILLED'
		      ELSE 'ACTIVE'
		    END,
		    updated_at = now()
		WHERE id = $1 AND tenant_id = $2 AND status = 'ACTIVE'
	`, reservationID, tenantID, quantity)
	return err
}

// GetAvailableQty returns unrestricted stock minus active reservations for a product at a site
func (r *ReservationRepository) GetAvailableQty(ctx context.Context, tenantID int64, productID int64, siteID int64) (float64, float64, float64, error) {
	var unrestricted, reserved, available float64
	err := r.db.QueryRow(ctx, `
		SELECT 
			COALESCE((
				SELECT SUM(hu.quantity) FROM handling_units hu
				JOIN zones z ON z.id = hu.zone_id
				WHERE hu.product_id = $2 AND hu.tenant_id = $1 
				  AND hu.status = 'IN_STOCK' AND hu.stock_type = 'UNRESTRICTED'
				  AND z.site_id = $3
			), 0) AS unrestricted_qty,
			COALESCE((
				SELECT SUM(r.quantity - r.fulfilled_qty) FROM stock_reservations r
				WHERE r.product_id = $2 AND r.tenant_id = $1 
				  AND r.status = 'ACTIVE' AND r.site_id = $3
			), 0) AS reserved_qty
	`, tenantID, productID, siteID).Scan(&unrestricted, &reserved)
	if err != nil {
		return 0, 0, 0, err
	}
	available = unrestricted - reserved
	if available < 0 {
		available = 0
	}
	return unrestricted, reserved, available, nil
}

// GetProductReservationSummary returns reservation summary for all products
func (r *ReservationRepository) GetProductReservationSummary(ctx context.Context, tenantID int64) ([]map[string]any, error) {
	rows, err := r.db.Query(ctx, `
		SELECT sr.product_id, p.code, p.name, p.base_unit,
		       SUM(sr.quantity - sr.fulfilled_qty) AS reserved_qty,
		       COUNT(*) AS reservation_count
		FROM stock_reservations sr
		JOIN products p ON sr.product_id = p.id
		WHERE sr.tenant_id = $1 AND sr.status = 'ACTIVE'
		GROUP BY sr.product_id, p.code, p.name, p.base_unit
		ORDER BY reserved_qty DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []map[string]any
	for rows.Next() {
		var productID int64
		var code, name, unit string
		var reservedQty float64
		var count int
		if err := rows.Scan(&productID, &code, &name, &unit, &reservedQty, &count); err == nil {
			results = append(results, map[string]any{
				"product_id":        productID,
				"product_code":      code,
				"product_name":      name,
				"base_unit":         unit,
				"reserved_qty":      reservedQty,
				"reservation_count": count,
			})
		}
	}
	return results, nil
}
