package repository

import (
	"context"

	"erplite/backend/internal/db/dbgen"
	"github.com/jackc/pgx/v5/pgtype"
)

type BarcodeRepository struct {
	db DBTX
}

func (r *BarcodeRepository) GetByCode(ctx context.Context, tenantID int64, code string) (dbgen.Barcode, error) {
	q := dbgen.New(r.db)
	return q.GetBarcode(ctx, dbgen.GetBarcodeParams{
		TenantID: pgtype.Int8{Int64: tenantID, Valid: true},
		Code:     code,
	})
}

type CreateBarcodeParams struct {
	TenantID   int64
	Code       string
	EntityType string
	EntityID   int64
}

func (r *BarcodeRepository) Create(ctx context.Context, p CreateBarcodeParams) error {
	_, err := r.db.Exec(ctx,
		"INSERT INTO barcodes (tenant_id, code, entity_type, entity_id, is_active) VALUES ($1, $2, $3, $4, true)",
		p.TenantID, p.Code, p.EntityType, p.EntityID)
	return err
}

func (r *BarcodeRepository) Deactivate(ctx context.Context, tenantID int64, code string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE barcodes SET is_active = false WHERE tenant_id = $1 AND code = $2",
		tenantID, code)
	return err
}
