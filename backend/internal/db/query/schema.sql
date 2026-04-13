-- name: GetUserByUsername :one
SELECT * FROM users
WHERE username = $1 LIMIT 1;

-- name: GetUserRoles :many
SELECT r.name 
FROM roles r
JOIN user_roles ur ON r.id = ur.role_id
WHERE ur.user_id = $1;

-- name: GetTenantByID :one
SELECT * FROM tenants
WHERE id = $1 LIMIT 1;

-- name: GetTenantBySlug :one
SELECT * FROM tenants
WHERE slug = $1 LIMIT 1;

-- name: GetBarcode :one
SELECT * FROM barcodes
WHERE tenant_id = $1 AND code = $2 AND is_active = true LIMIT 1;

-- name: GetHUByBarcode :one
SELECT hu.*
FROM handling_units hu
JOIN barcodes b ON b.entity_id = hu.id AND b.entity_type = 'HU'
WHERE b.tenant_id = $1 AND b.code = $2 AND b.is_active = true LIMIT 1;

-- name: GetLocationByBarcode :one
SELECT l.*
FROM locations l
JOIN barcodes b ON b.entity_id = l.id AND b.entity_type = 'LOCATION'
WHERE b.tenant_id = $1 AND b.code = $2 AND b.is_active = true LIMIT 1;

-- name: GetHUByID :one
SELECT * FROM handling_units
WHERE id = $1 LIMIT 1;

-- name: GetHUWithDetails :one
SELECT 
    hu.*,
    p.code as product_code,
    p.name as product_name,
    l.code as location_code
FROM handling_units hu
JOIN products p ON hu.product_id = p.id
JOIN locations l ON hu.location_id = l.id
WHERE hu.id = $1 LIMIT 1;

-- name: UpdateHULocation :exec
UPDATE handling_units
SET location_id = $2, updated_at = now()
WHERE id = $1;

-- name: UpdateHUStatus :exec
UPDATE handling_units
SET status = $2, updated_at = now()
WHERE id = $1;

-- name: CreateInventoryEvent :one
INSERT INTO inventory_events (
    tenant_id, event_type, hu_id, child_hu_id, 
    from_location_id, to_location_id, quantity, unit, 
    actor_user_id, reference_doc, metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING *;

-- name: ListRecentEvents :many
SELECT 
    e.*,
    u.username as actor_name,
    hu.public_id as hu_public_id
FROM inventory_events e
LEFT JOIN users u ON e.actor_user_id = u.id
LEFT JOIN handling_units hu ON e.hu_id = hu.id
WHERE e.tenant_id = $1
ORDER BY e.created_at DESC
LIMIT $2;

-- name: GetLocationStock :many
SELECT 
    hu.*,
    p.code as product_code,
    p.name as product_name
FROM handling_units hu
JOIN products p ON hu.product_id = p.id
WHERE hu.location_id = $1 AND hu.quantity > 0;

-- name: ListLocations :many
SELECT * FROM locations
WHERE tenant_id = $1 AND is_active = true
ORDER BY code ASC;

-- name: ListRecentHUs :many
SELECT 
    hu.*,
    p.code as product_code,
    l.code as location_code
FROM handling_units hu
JOIN products p ON hu.product_id = p.id
JOIN locations l ON hu.location_id = l.id
WHERE hu.tenant_id = $1
ORDER BY hu.updated_at DESC
LIMIT $2;
