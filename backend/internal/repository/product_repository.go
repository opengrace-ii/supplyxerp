package repository

import (
	"context"
	"encoding/json"
	"supplyxerp/backend/internal/db/dbgen"

	"github.com/jackc/pgx/v5/pgtype"
)

type ProductRepository struct {
	db DBTX
}

func (r *ProductRepository) List(ctx context.Context, tenantID int64, limit, offset int32) ([]dbgen.Product, error) {
	rows, err := r.db.Query(ctx, 
		"SELECT id, public_id, tenant_id, code, name, base_unit, description, attributes, created_at, uom_conversions FROM products WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT $2 OFFSET $3",
		tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []dbgen.Product
	for rows.Next() {
		var p dbgen.Product
		err := rows.Scan(
			&p.ID, &p.PublicID, &p.TenantID, &p.Code, &p.Name, 
			&p.BaseUnit, &p.Description, &p.Attributes, &p.CreatedAt, &p.UomConversions,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}

func (r *ProductRepository) GetByPublicID(ctx context.Context, tenantID int64, publicID pgtype.UUID) (dbgen.Product, error) {
	var p dbgen.Product
	err := r.db.QueryRow(ctx,
		"SELECT id, public_id, tenant_id, code, name, base_unit, description, attributes, created_at, uom_conversions FROM products WHERE tenant_id = $1 AND public_id = $2",
		tenantID, publicID).Scan(
		&p.ID, &p.PublicID, &p.TenantID, &p.Code, &p.Name, 
		&p.BaseUnit, &p.Description, &p.Attributes, &p.CreatedAt, &p.UomConversions,
	)
	return p, err
}

func (r *ProductRepository) Create(ctx context.Context, p dbgen.Product) (dbgen.Product, error) {
	err := r.db.QueryRow(ctx,
		"INSERT INTO products (tenant_id, code, name, base_unit, description, attributes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, public_id, created_at",
		p.TenantID, p.Code, p.Name, p.BaseUnit, p.Description, p.Attributes).Scan(&p.ID, &p.PublicID, &p.CreatedAt)
	return p, err
}

func (r *ProductRepository) Update(ctx context.Context, tenantID int64, publicID pgtype.UUID, name, description string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE products SET name = $1, description = $2 WHERE tenant_id = $3 AND public_id = $4",
		name, description, tenantID, publicID)
	return err
}

func (r *ProductRepository) Deactivate(ctx context.Context, tenantID int64, publicID pgtype.UUID) error {
	_, err := r.db.Exec(ctx,
		"UPDATE products SET is_active = false WHERE tenant_id = $1 AND public_id = $2",
		tenantID, publicID)
	return err
}

func (r *ProductRepository) Count(ctx context.Context, tenantID int64) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM products WHERE tenant_id = $1 AND is_active = true", tenantID).Scan(&count)
	return count, err
}

func (r *ProductRepository) GetByCode(ctx context.Context, tenantID int64, code string) (dbgen.Product, error) {
	var p dbgen.Product
	err := r.db.QueryRow(ctx,
		"SELECT id, public_id, tenant_id, code, name, base_unit, description, attributes, created_at, uom_conversions FROM products WHERE tenant_id = $1 AND code = $2",
		tenantID, code).Scan(
		&p.ID, &p.PublicID, &p.TenantID, &p.Code, &p.Name, 
		&p.BaseUnit, &p.Description, &p.Attributes, &p.CreatedAt, &p.UomConversions,
	)
	return p, err
}

func (r *ProductRepository) UpdateUOMConversions(ctx context.Context, tenantID int64, publicID pgtype.UUID, conversions []any) error {
	data, _ := json.Marshal(conversions)
	_, err := r.db.Exec(ctx,
		"UPDATE products SET uom_conversions = $1 WHERE tenant_id = $2 AND public_id = $3",
		data, tenantID, publicID)
	return err
}
