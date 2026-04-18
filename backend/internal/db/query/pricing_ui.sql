-- name: CountConditionTypes :one
SELECT COUNT(*) FROM condition_types WHERE tenant_id = $1;

-- name: CreateConditionType :one
INSERT INTO condition_types (
    tenant_id, code, name, condition_class, calculation_type, plus_minus, base_step, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING id;

-- name: CreateCalculationSchema :one
INSERT INTO calculation_schemas (tenant_id, code, name, is_active)
VALUES ($1, $2, $3, $4) RETURNING id;

-- name: CreateCalculationSchemaStep :exec
INSERT INTO calculation_schema_steps (
    tenant_id, schema_id, step_number, condition_type_id, subtotal_flag, is_statistical
) VALUES (
    $1, $2, $3, $4, $5, $6
);

-- name: GetPricingConfig :one
SELECT approval_mode, flat_pr_threshold, flat_po_threshold, default_tolerance_pct, default_currency, condition_types_seeded
FROM tenant_config WHERE tenant_id = $1;

-- name: UpdatePricingConfig :exec
UPDATE tenant_config
SET approval_mode = $2, flat_pr_threshold = $3, flat_po_threshold = $4, default_tolerance_pct = $5, default_currency = $6
WHERE tenant_id = $1;

-- name: MarkConditionTypesSeeded :exec
UPDATE tenant_config
SET condition_types_seeded = true
WHERE tenant_id = $1;

-- name: GetProductPricing :one
SELECT price_control, standard_price, standard_price_unit, standard_currency, map_price, last_po_price, last_po_date, auto_approve_tolerance_pct, requires_quotation, reorder_point, safety_stock, max_stock_level, procurement_type
FROM products WHERE id = $1 AND tenant_id = $2;

-- name: UpdateProductPricing :exec
UPDATE products
SET price_control = $3,
    standard_price = $4,
    standard_price_unit = $5,
    standard_currency = $6,
    map_price = $7,
    auto_approve_tolerance_pct = $8,
    requires_quotation = $9,
    reorder_point = $10,
    safety_stock = $11,
    max_stock_level = $12,
    procurement_type = $13
WHERE id = $1 AND tenant_id = $2;

-- name: CloseProductPriceHistory :exec
UPDATE product_price_history
SET valid_to = now()
WHERE product_id = $1 AND tenant_id = $2 AND price_type = 'STANDARD' AND valid_to IS NULL;

-- name: CreateProductPriceHistory :exec
INSERT INTO product_price_history (
    tenant_id, product_id, price_type, price, currency, valid_from, changed_by_username, change_reason, source_document
) VALUES (
    $1, $2, $3, $4, $5, now(), $6, $7, $8
);

-- name: ListProductPriceHistory :many
SELECT * FROM product_price_history
WHERE product_id = $1 AND tenant_id = $2
ORDER BY valid_from DESC;

-- name: ListSupplierInfoRecords :many
SELECT ir.*, p.code as product_code, p.name as product_name
FROM purchasing_info_records ir
JOIN products p ON ir.product_id = p.id
WHERE ir.tenant_id = $1 AND ir.supplier_id = $2 AND ir.is_active = true
ORDER BY ir.created_at DESC;

-- name: ListAllInfoRecords :many
SELECT ir.*, s.name as supplier_name, p.code as product_code, p.name as product_name
FROM purchasing_info_records ir
JOIN suppliers s ON ir.supplier_id = s.id
JOIN products p ON ir.product_id = p.id
WHERE ir.tenant_id = $1 AND (sqlc.narg('active_only')::boolean = false OR ir.is_active = true)
ORDER BY s.name ASC, p.name ASC;

-- name: GenerateNextInfoRecordSequence :one
UPDATE tenant_sequences
SET current_val = current_val + 1
WHERE tenant_id = $1 AND sequence_type = 'ir'
RETURNING current_val;

-- name: GetIRNumberFormat :one
SELECT ir_number_format FROM tenant_config WHERE tenant_id = $1;
