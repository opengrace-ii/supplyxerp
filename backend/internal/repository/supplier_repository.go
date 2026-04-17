package repository

import (
	"context"
	"supplyxerp/backend/internal/db/dbgen"
)

type SupplierRepository struct {
	db DBTX
}

func (r *SupplierRepository) Create(ctx context.Context, arg dbgen.Supplier) (dbgen.Supplier, error) {
	var s dbgen.Supplier
	err := r.db.QueryRow(ctx, `
		INSERT INTO suppliers (
			tenant_id, code, name, contact_name, email, phone,
			address_line1, address_line2, city, country, postal_code,
			tax_number, bank_name, bank_account, bank_sort_code,
			incoterms, incoterms_location, preferred_currency, credit_limit,
			supplier_group, rating, website, on_hold, on_hold_reason,
			currency, payment_terms_days, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
		) RETURNING id, public_id, tenant_id, code, name, created_at, updated_at
	`, arg.TenantID, arg.Code, arg.Name, arg.ContactName, arg.Email, arg.Phone,
		arg.AddressLine1, arg.AddressLine2, arg.City, arg.Country, arg.PostalCode,
		arg.TaxNumber, arg.BankName, arg.BankAccount, arg.BankSortCode,
		arg.Incoterms, arg.IncotermsLocation, arg.PreferredCurrency, arg.CreditLimit,
		arg.SupplierGroup, arg.Rating, arg.Website, arg.OnHold, arg.OnHoldReason,
		arg.Currency, arg.PaymentTermsDays, arg.Notes,
	).Scan(&s.ID, &s.PublicID, &s.TenantID, &s.Code, &s.Name, &s.CreatedAt, &s.UpdatedAt)
	return s, err
}

func (r *SupplierRepository) List(ctx context.Context, tenantID int64, limit, offset int32) ([]dbgen.Supplier, error) {
	q := dbgen.New(r.db)
	return q.ListSuppliers(ctx, dbgen.ListSuppliersParams{
		TenantID: tenantID,
		Limit:    limit,
		Offset:   offset,
	})
}

func (r *SupplierRepository) GetByCode(ctx context.Context, tenantID int64, code string) (dbgen.Supplier, error) {
	q := dbgen.New(r.db)
	return q.GetSupplierByCode(ctx, dbgen.GetSupplierByCodeParams{
		TenantID: tenantID,
		Code:     code,
	})
}

func (r *SupplierRepository) Update(ctx context.Context, arg dbgen.Supplier) (dbgen.Supplier, error) {
	var s dbgen.Supplier
	err := r.db.QueryRow(ctx, `
		UPDATE suppliers SET
			name = $1, contact_name = $2, email = $3, phone = $4,
			address_line1 = $5, address_line2 = $6, city = $7, country = $8, postal_code = $9,
			tax_number = $10, bank_name = $11, bank_account = $12, bank_sort_code = $13,
			incoterms = $14, incoterms_location = $15, preferred_currency = $16, credit_limit = $17,
			supplier_group = $18, rating = $19, website = $20, on_hold = $21, on_hold_reason = $22,
			currency = $23, payment_terms_days = $24, notes = $25, updated_at = NOW()
		WHERE id = $26 AND tenant_id = $27
		RETURNING id, public_id, tenant_id, code, name, created_at, updated_at
	`, arg.Name, arg.ContactName, arg.Email, arg.Phone,
		arg.AddressLine1, arg.AddressLine2, arg.City, arg.Country, arg.PostalCode,
		arg.TaxNumber, arg.BankName, arg.BankAccount, arg.BankSortCode,
		arg.Incoterms, arg.IncotermsLocation, arg.PreferredCurrency, arg.CreditLimit,
		arg.SupplierGroup, arg.Rating, arg.Website, arg.OnHold, arg.OnHoldReason,
		arg.Currency, arg.PaymentTermsDays, arg.Notes, arg.ID, arg.TenantID,
	).Scan(&s.ID, &s.PublicID, &s.TenantID, &s.Code, &s.Name, &s.CreatedAt, &s.UpdatedAt)
	return s, err
}

func (r *SupplierRepository) Deactivate(ctx context.Context, tenantID, id int64) error {
	q := dbgen.New(r.db)
	return q.DeactivateSupplier(ctx, dbgen.DeactivateSupplierParams{
		TenantID: tenantID,
		ID:       id,
	})
}
