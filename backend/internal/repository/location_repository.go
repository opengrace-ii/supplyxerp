package repository

import (
	"context"

	"supplyxerp/backend/internal/db/dbgen"
	"github.com/jackc/pgx/v5/pgtype"
)

type LocationRepository struct {
	db DBTX
}

func (r *LocationRepository) GetByBarcode(ctx context.Context, tenantID int64, barcode string) (dbgen.Location, error) {
	q := dbgen.New(r.db)
	return q.GetLocationByBarcode(ctx, dbgen.GetLocationByBarcodeParams{
		TenantID: pgtype.Int8{Int64: tenantID, Valid: true},
		Code:     barcode,
	})
}

func (r *LocationRepository) List(ctx context.Context, tenantID int64) ([]dbgen.Location, error) {
	q := dbgen.New(r.db)
	return q.ListLocations(ctx, pgtype.Int8{Int64: tenantID, Valid: true})
}

func (r *LocationRepository) GetStock(ctx context.Context, locationID int64) ([]dbgen.GetLocationStockRow, error) {
	q := dbgen.New(r.db)
	return q.GetLocationStock(ctx, pgtype.Int8{Int64: locationID, Valid: true})
}
