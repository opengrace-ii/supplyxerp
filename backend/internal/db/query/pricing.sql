-- name: GetConditionTypeByCode :one
SELECT * FROM condition_types 
WHERE tenant_id = $1 AND code = $2 LIMIT 1;

-- name: ListConditionTypes :many
SELECT * FROM condition_types 
WHERE tenant_id = $1 AND is_active = true
ORDER BY code ASC;

-- name: GetCalculationSchema :one
SELECT * FROM calculation_schemas
WHERE tenant_id = $1 AND code = $2 LIMIT 1;

-- name: GetCalculationSchemaSteps :many
SELECT s.*, c.code as condition_type_code, c.calculation_type, c.condition_class, c.base_step, c.plus_minus
FROM calculation_schema_steps s
LEFT JOIN condition_types c ON s.condition_type_id = c.id
WHERE s.tenant_id = $1 AND s.schema_id = $2
ORDER BY s.step_number ASC;

-- name: GetAccessSequenceSteps :many
SELECT s.* 
FROM access_sequence_steps s
WHERE s.tenant_id = $1 AND s.access_sequence_id = $2
ORDER BY s.step_number ASC;

-- name: GetValidConditionRecord :one
SELECT * FROM pricing_condition_records
WHERE tenant_id = $1 
  AND condition_type_id = $2
  AND valid_from <= $3 
  AND valid_to >= $3
  AND (sqlc.narg('supplier_id')::bigint IS NULL OR supplier_id = sqlc.narg('supplier_id'))
  AND (sqlc.narg('product_id')::bigint IS NULL OR product_id = sqlc.narg('product_id'))
  AND (sqlc.narg('site_id')::bigint IS NULL OR site_id = sqlc.narg('site_id'))
ORDER BY rate_amount DESC
LIMIT 1;

-- name: GetPurchasingInfoRecord :one
SELECT * FROM purchasing_info_records
WHERE tenant_id = $1 
  AND supplier_id = $2
  AND product_id = $3
  AND (sqlc.narg('site_id')::bigint IS NULL OR site_id = sqlc.narg('site_id'))
LIMIT 1;

-- name: CreatePurchasingInfoRecord :one
INSERT INTO purchasing_info_records (
    tenant_id, info_record_number, supplier_id, product_id, site_id, purchasing_org, 
    supplier_material_num, planned_delivery_time_days, standard_qty, 
    minimum_qty, max_order_quantity, overdelivery_tolerance_pct, underdelivery_tolerance_pct,
    auto_approve_below, requires_quotation, net_price, currency, per_quantity, per_unit,
    valid_from, valid_to, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
) RETURNING *;

-- name: UpdatePurchasingInfoRecord :one
UPDATE purchasing_info_records
SET
    supplier_material_num = $3,
    planned_delivery_time_days = $4,
    standard_qty = $5,
    minimum_qty = $6,
    max_order_quantity = $7,
    overdelivery_tolerance_pct = $8,
    underdelivery_tolerance_pct = $9,
    auto_approve_below = $10,
    requires_quotation = $11,
    net_price = $12,
    currency = $13,
    per_quantity = $14,
    per_unit = $15,
    valid_from = $16,
    valid_to = $17,
    is_active = $18,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING *;


