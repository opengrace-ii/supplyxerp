-- name: GetRFQTypes :many
SELECT * FROM rfq_document_types
WHERE tenant_id = $1 AND is_active = true
ORDER BY type_code ASC;

-- name: CreateRFQType :one
INSERT INTO rfq_document_types (
    tenant_id, type_code, description, is_gp_bid
) VALUES (
    $1, $2, $3, $4
) ON CONFLICT (tenant_id, type_code) DO NOTHING
RETURNING *;

-- name: UpdateRFQType :one
UPDATE rfq_document_types
SET description = $3, is_gp_bid = $4, is_active = $5, created_at = now()
WHERE tenant_id = $1 AND type_code = $2
RETURNING *;

-- name: GetOrderReasons :many
SELECT * FROM rfq_order_reasons
WHERE tenant_id = $1 AND is_active = true
ORDER BY reason_code ASC;

-- name: CreateOrderReason :one
INSERT INTO rfq_order_reasons (
    tenant_id, reason_code, description
) VALUES (
    $1, $2, $3
) ON CONFLICT (tenant_id, reason_code) DO NOTHING
RETURNING *;

-- name: UpdateOrderReason :one
UPDATE rfq_order_reasons
SET description = $3, is_active = $4
WHERE tenant_id = $1 AND reason_code = $2
RETURNING *;

-- name: CreateDeliverySchedule :exec
INSERT INTO rfq_delivery_schedules (
    tenant_id, rfq_line_id, delivery_date, quantity, is_fixed
) VALUES (
    $1, $2, $3, $4, $5
);

-- name: GetDeliverySchedules :many
SELECT * FROM rfq_delivery_schedules
WHERE rfq_line_id = $1
ORDER BY delivery_date ASC;

-- name: DeleteDeliverySchedulesForLine :exec
DELETE FROM rfq_delivery_schedules
WHERE rfq_line_id = $1;
