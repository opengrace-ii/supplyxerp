package repository

import (
	"context"

	"erplite/backend/internal/db/dbgen"
	"github.com/jackc/pgx/v5/pgtype"
)

type HURepository struct {
	db DBTX
}

func (r *HURepository) GetByBarcode(ctx context.Context, tenantID int64, barcode string) (dbgen.HandlingUnit, error) {
	q := dbgen.New(r.db)
	return q.GetHUByBarcode(ctx, dbgen.GetHUByBarcodeParams{
		TenantID: pgtype.Int8{Int64: tenantID, Valid: true},
		Code:     barcode,
	})
}

func (r *HURepository) GetByID(ctx context.Context, id int64) (dbgen.HandlingUnit, error) {
	q := dbgen.New(r.db)
	return q.GetHUByID(ctx, id)
}

func (r *HURepository) GetWithDetails(ctx context.Context, id int64) (dbgen.GetHUWithDetailsRow, error) {
	q := dbgen.New(r.db)
	return q.GetHUWithDetails(ctx, id)
}

func (r *HURepository) UpdateLocation(ctx context.Context, id int64, locationID int64) error {
	q := dbgen.New(r.db)
	return q.UpdateHULocation(ctx, dbgen.UpdateHULocationParams{
		ID:         id,
		LocationID: pgtype.Int8{Int64: locationID, Valid: true},
	})
}

func (r *HURepository) UpdateZone(ctx context.Context, id int64, zoneID int64, siteID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE handling_units 
		SET zone_id = $1, site_id = $2, updated_at = now() 
		WHERE id = $3
	`, zoneID, siteID, id)
	return err
}

func (r *HURepository) UpdateStatus(ctx context.Context, id int64, status string) error {
	q := dbgen.New(r.db)
	return q.UpdateHUStatus(ctx, dbgen.UpdateHUStatusParams{
		ID:     id,
		Status: status,
	})
}

func (r *HURepository) ListRecent(ctx context.Context, tenantID int64, limit int32) ([]dbgen.ListRecentHUsRow, error) {
	q := dbgen.New(r.db)
	return q.ListRecentHUs(ctx, dbgen.ListRecentHUsParams{
		TenantID: pgtype.Int8{Int64: tenantID, Valid: true},
		Limit:    limit,
	})
}
