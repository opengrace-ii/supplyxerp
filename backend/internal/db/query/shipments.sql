-- name: ListCarriers :many
SELECT * FROM carriers
WHERE tenant_id = $1 AND is_active = true
ORDER BY name ASC;

-- name: CreateCarrier :one
INSERT INTO carriers (
    tenant_id, code, name, mode,
    tracking_url, contact_name, contact_email, contact_phone
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: CreateShipment :one
INSERT INTO shipments (
    tenant_id, sales_order_id, carrier_id,
    ship_to_address, ship_to_city, ship_to_country,
    planned_date, notes, created_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: AddShipmentLine :one
INSERT INTO shipment_lines (
    shipment_id, sales_order_line_id, line_number,
    description, quantity, unit_of_measure, material_id
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListShipments :many
SELECT
    s.*,
    so.so_number,
    c_cust.name  AS customer_name,
    carr.name    AS carrier_name,
    carr.mode    AS carrier_mode,
    (SELECT COUNT(*) FROM shipment_lines sl
     WHERE sl.shipment_id = s.id) AS line_count
FROM shipments s
LEFT JOIN sales_orders  so     ON so.id    = s.sales_order_id
LEFT JOIN customers     c_cust ON c_cust.id = so.customer_id
LEFT JOIN carriers      carr   ON carr.id  = s.carrier_id
WHERE s.tenant_id = $1
ORDER BY s.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetShipmentByPublicID :one
SELECT
    s.*,
    so.so_number,
    c_cust.name  AS customer_name,
    carr.name    AS carrier_name,
    carr.mode    AS carrier_mode,
    carr.tracking_url
FROM shipments s
LEFT JOIN sales_orders  so     ON so.id    = s.sales_order_id
LEFT JOIN customers     c_cust ON c_cust.id = so.customer_id
LEFT JOIN carriers      carr   ON carr.id  = s.carrier_id
WHERE s.public_id = $1 AND s.tenant_id = $2;

-- name: GetShipmentLines :many
SELECT
    sl.*,
    m.code AS material_code,
    m.name AS material_name
FROM shipment_lines sl
LEFT JOIN products m ON m.id = sl.material_id
WHERE sl.shipment_id = $1
ORDER BY sl.line_number;

-- name: AssignCarrier :one
UPDATE shipments
SET carrier_id   = $2,
    tracking_ref = $3,
    planned_date = $4,
    updated_at   = NOW()
WHERE id = $1 AND tenant_id = $5
  AND status IN ('PENDING','PICKING','PACKED')
RETURNING *;

-- name: UpdateShipmentStatus :one
UPDATE shipments
SET status     = $2,
    updated_at = NOW()
WHERE id = $1 AND tenant_id = $3
RETURNING *;

-- name: DispatchShipment :one
UPDATE shipments
SET status        = 'DISPATCHED',
    dispatched_at = NOW(),
    updated_at    = NOW()
WHERE id = $1
  AND tenant_id = $2
  AND status IN ('PACKED','PICKING','PENDING')
  AND carrier_id IS NOT NULL
RETURNING *;

-- name: MarkDelivered :one
UPDATE shipments
SET status       = 'DELIVERED',
    delivered_at = NOW(),
    updated_at   = NOW()
WHERE id = $1 AND tenant_id = $2
  AND status = 'DISPATCHED'
RETURNING *;

-- name: GetRouteRunnerDashboard :one
SELECT
    COUNT(*)                                                  AS total_shipments,
    COUNT(*) FILTER (WHERE status = 'PENDING')                AS pending,
    COUNT(*) FILTER (WHERE status IN ('PICKING','PACKED'))    AS in_progress,
    COUNT(*) FILTER (WHERE status = 'DISPATCHED')             AS dispatched,
    COUNT(*) FILTER (WHERE status = 'IN_TRANSIT')             AS in_transit,
    COUNT(*) FILTER (WHERE status = 'DELIVERED')              AS delivered,
    COUNT(*) FILTER (WHERE status = 'CANCELLED')              AS cancelled,
    COUNT(*) FILTER (WHERE status = 'DISPATCHED'
      AND planned_date < CURRENT_DATE)                        AS overdue
FROM shipments
WHERE tenant_id = $1;
