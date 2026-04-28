-- name: GetPOLineForGR :one
SELECT 
    pol.id, pol.quantity, pol.qty_received, pol.overdelivery_tolerance_pct, 
    pol.overdelivery_requires_approval, pol.tenant_id
FROM purchase_order_lines pol
WHERE pol.id = sqlc.arg(id)::BIGINT AND pol.tenant_id = sqlc.arg(tenant_id)::BIGINT;

-- name: CreateGRHold :one
INSERT INTO gr_overdelivery_holds (
    tenant_id, gr_id, po_line_id, po_quantity, received_quantity, requested_by, status
) VALUES (
    sqlc.arg(tenant_id)::BIGINT, sqlc.arg(gr_id)::BIGINT, sqlc.arg(po_line_id)::BIGINT, sqlc.arg(po_quantity), sqlc.arg(received_quantity), sqlc.arg(requested_by)::BIGINT, 'PENDING'
) RETURNING *;

-- name: GetPendingOverdeliveryHolds :many
SELECT * FROM gr_overdelivery_holds
WHERE tenant_id = sqlc.arg(tenant_id)::BIGINT AND status = 'PENDING'
ORDER BY created_at DESC;

-- name: ResolveOverdeliveryHold :one
UPDATE gr_overdelivery_holds
SET status = sqlc.arg(status), approved_by = sqlc.arg(approved_by)::BIGINT, resolved_at = NOW(), notes = sqlc.arg(notes)
WHERE public_id = sqlc.arg(public_id) AND tenant_id = sqlc.arg(tenant_id)::BIGINT
RETURNING *;

-- name: GetStockByMaterialAndTenant :many
SELECT
  z.code AS zone_code, z.zone_type,
  ie.stock_type,
  SUM(ie.quantity) AS quantity
FROM inventory_events ie
JOIN zones z ON z.id = ie.zone_id
WHERE ie.tenant_id = sqlc.arg(tenant_id)::BIGINT AND ie.product_id = sqlc.arg(product_id)::BIGINT
GROUP BY z.code, z.zone_type, ie.stock_type
HAVING SUM(ie.quantity) > 0;

-- name: UpdateGRStatus :one
UPDATE gr_documents SET status = sqlc.arg(status) WHERE id = sqlc.arg(id)::BIGINT AND tenant_id = sqlc.arg(tenant_id)::BIGINT
RETURNING *;
