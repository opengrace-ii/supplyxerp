-- name: CreateQualityCheck :one
INSERT INTO quality_checks (
    tenant_id, reference_type, reference_id, reference_code,
    supplier_id, material_id, inspect_qty, unit_of_measure,
    notes, created_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: ListQualityChecks :many
SELECT
    qc.*,
    s.name  AS supplier_name,
    m.code  AS material_code,
    m.name  AS material_name
FROM quality_checks qc
LEFT JOIN suppliers s ON s.id = qc.supplier_id
LEFT JOIN products m ON m.id = qc.material_id
WHERE qc.tenant_id = $1
ORDER BY
    CASE qc.status WHEN 'PENDING' THEN 1
                   WHEN 'IN_PROGRESS' THEN 2
                   ELSE 3 END,
    qc.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetQualityCheckByPublicID :one
SELECT
    qc.*,
    s.name AS supplier_name,
    m.code AS material_code,
    m.name AS material_name
FROM quality_checks qc
LEFT JOIN suppliers s ON s.id = qc.supplier_id
LEFT JOIN products m ON m.id = qc.material_id
WHERE qc.public_id = $1 AND qc.tenant_id = $2;

-- name: StartQualityCheck :one
UPDATE quality_checks
SET status       = 'IN_PROGRESS',
    inspector_id = $2,
    started_at   = NOW(),
    updated_at   = NOW()
WHERE id = $1
  AND status = 'PENDING'
  AND tenant_id = $3
RETURNING *;

-- name: RecordQCResult :one
UPDATE quality_checks
SET status       = $2,
    result       = $3,
    passed_qty   = $4,
    failed_qty   = $5,
    completed_at = NOW(),
    notes        = COALESCE($6, notes),
    updated_at   = NOW()
WHERE id = $1
  AND status = 'IN_PROGRESS'
  AND tenant_id = $7
RETURNING *;

-- name: AddQCFinding :one
INSERT INTO quality_check_findings (
    quality_check_id, finding_number,
    finding_type, severity, description,
    quantity_affected
) VALUES (
    $1,
    (SELECT COALESCE(MAX(finding_number),0)+1
     FROM quality_check_findings
     WHERE quality_check_id = $1),
    $2, $3, $4, $5
)
RETURNING *;

-- name: GetQCFindings :many
SELECT * FROM quality_check_findings
WHERE quality_check_id = $1
ORDER BY finding_number;

-- name: GetQualityGateDashboard :one
SELECT
    COUNT(*)                                              AS total_checks,
    COUNT(*) FILTER (WHERE status = 'PENDING')           AS pending,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')       AS in_progress,
    COUNT(*) FILTER (WHERE result = 'ACCEPT')            AS passed,
    COUNT(*) FILTER (WHERE result = 'REJECT')            AS failed,
    COUNT(*) FILTER (WHERE result = 'CONDITIONAL')       AS conditional,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE result = 'ACCEPT') /
        NULLIF(COUNT(*) FILTER (WHERE result IS NOT NULL), 0)
    , 1)                                                  AS pass_rate_pct
FROM quality_checks
WHERE tenant_id = $1
  AND created_at >= NOW() - INTERVAL '90 days';

-- name: RecordScorecardEvent :one
INSERT INTO vendor_scorecard_events (
    tenant_id, supplier_id, event_type, reference_type,
    reference_id, reference_code, score_impact, notes, recorded_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

