-- name: CreateBuildOrder :one
INSERT INTO build_orders (
    tenant_id, output_material_id, bom_id,
    planned_qty, unit_of_measure,
    planned_start, planned_finish,
    priority, notes, created_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: ListBuildOrders :many
SELECT
    bo.*,
    m.code AS output_material_code,
    m.name AS output_material_name
FROM build_orders bo
JOIN products m ON m.id = bo.output_material_id
WHERE bo.tenant_id = $1
ORDER BY
    CASE bo.priority
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH'   THEN 2
        WHEN 'NORMAL' THEN 3
        WHEN 'LOW'    THEN 4
    END,
    bo.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetBuildOrderByPublicID :one
SELECT
    bo.*,
    m.code AS output_material_code,
    m.name AS output_material_name
FROM build_orders bo
JOIN products m ON m.id = bo.output_material_id
WHERE bo.public_id = $1 AND bo.tenant_id = $2;

-- name: ReleaseBuildOrder :one
UPDATE build_orders
SET status      = 'RELEASED',
    released_by = $2,
    released_at = NOW(),
    updated_at  = NOW()
WHERE id = $1
  AND status = 'DRAFT'
  AND tenant_id = $3
RETURNING *;

-- name: StartBuildOrder :one
UPDATE build_orders
SET status       = 'IN_PROGRESS',
    actual_start = NOW(),
    updated_at   = NOW()
WHERE id = $1
  AND status = 'RELEASED'
  AND tenant_id = $2
RETURNING *;

-- name: CompleteBuildOrder :one
UPDATE build_orders
SET status        = 'COMPLETED',
    actual_qty    = $2,
    actual_finish = NOW(),
    completed_by  = $3,
    completed_at  = NOW(),
    updated_at    = NOW()
WHERE id = $1
  AND status = 'IN_PROGRESS'
  AND tenant_id = $4
RETURNING *;

-- name: CancelBuildOrder :one
UPDATE build_orders
SET status     = 'CANCELLED',
    updated_at = NOW()
WHERE id = $1
  AND status IN ('DRAFT', 'RELEASED')
  AND tenant_id = $2
RETURNING *;

-- name: IssueComponentToBuildOrder :one
INSERT INTO build_order_issues (
    build_order_id, material_id,
    issued_qty, unit_of_measure,
    issued_by, notes
) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetBuildOrderIssues :many
SELECT
    boi.*,
    m.code AS material_code,
    m.name AS material_name
FROM build_order_issues boi
JOIN products m ON m.id = boi.material_id
WHERE boi.build_order_id = $1
ORDER BY boi.issued_at DESC;

-- name: GetBuildOrderDashboard :one
SELECT
    COUNT(*)                                              AS total_orders,
    COUNT(*) FILTER (WHERE status = 'DRAFT')             AS draft,
    COUNT(*) FILTER (WHERE status = 'RELEASED')          AS released,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')       AS in_progress,
    COUNT(*) FILTER (WHERE status = 'COMPLETED')         AS completed,
    COUNT(*) FILTER (WHERE status = 'CANCELLED')         AS cancelled,
    COUNT(*) FILTER (WHERE priority = 'URGENT'
      AND status NOT IN ('COMPLETED','CANCELLED'))       AS urgent_open,
    COUNT(*) FILTER (WHERE planned_finish < CURRENT_DATE
      AND status NOT IN ('COMPLETED','CANCELLED'))       AS overdue
FROM build_orders
WHERE tenant_id = $1;

-- name: GetBOMByOutputMaterial :one
SELECT bom.*, m.code AS output_code, m.name AS output_name
FROM bill_of_materials bom
JOIN products m ON m.id = bom.output_material_id
WHERE bom.tenant_id = $1
  AND bom.output_material_id = $2
  AND bom.is_active = true
ORDER BY bom.version DESC
LIMIT 1;

-- name: GetBOMLines :many
SELECT
    bl.*,
    m.code AS component_code,
    m.name AS component_name,
    m.base_unit AS component_uom
FROM bom_lines bl
JOIN products m ON m.id = bl.component_material_id
WHERE bl.bom_id = $1
ORDER BY bl.line_number;
