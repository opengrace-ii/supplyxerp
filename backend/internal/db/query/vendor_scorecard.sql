-- name: GetScorecardEvents :many
SELECT * FROM vendor_scorecard_events
WHERE tenant_id = $1
  AND supplier_id = $2
  AND recorded_at >= $3
ORDER BY recorded_at DESC;

-- name: RecordScorecardEvent :one
INSERT INTO vendor_scorecard_events (
    tenant_id, supplier_id, event_type,
    reference_type, reference_id, reference_code,
    score_impact, notes, recorded_by
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateVendorScorecardCalculated :exec
UPDATE vendor_scorecards
SET auto_score        = $3,
    delivery_score    = $4,
    quality_score     = $5,
    compliance_score  = $6,
    total_orders      = $7,
    on_time_count     = $8,
    late_count        = $9,
    quality_pass      = $10,
    quality_fail      = $11,
    last_calculated   = $12,
    calculated_by     = 'SYSTEM',
    updated_at        = NOW()
WHERE tenant_id = $1 AND supplier_id = $2;

-- name: GetVendorScorecardBySupplier :one
SELECT vs.*, s.name AS supplier_name, s.public_id AS supplier_code
FROM vendor_scorecards vs
JOIN suppliers s ON s.id = vs.supplier_id
WHERE vs.tenant_id = $1 AND vs.supplier_id = $2;

-- name: ListVendorScorecards :many
SELECT
    vs.*,
    s.name  AS supplier_name,
    s.public_id  AS supplier_code,
    s.email AS supplier_email,
    (SELECT COUNT(*) FROM vendor_scorecard_events e
     WHERE e.supplier_id = vs.supplier_id
       AND e.tenant_id = vs.tenant_id
       AND e.recorded_at >= NOW() - INTERVAL '30 days'
    ) AS events_last_30d
FROM vendor_scorecards vs
JOIN suppliers s ON s.id = vs.supplier_id
WHERE vs.tenant_id = $1
ORDER BY vs.auto_score ASC;  -- worst performers first

-- name: ListScorecardEvents :many
SELECT vse.*, u.username AS recorded_by_name
FROM vendor_scorecard_events vse
LEFT JOIN users u ON u.id = vse.recorded_by
WHERE vse.tenant_id = $1 AND vse.supplier_id = $2
ORDER BY vse.recorded_at DESC
LIMIT $3 OFFSET $4;

-- name: GetScorecardSummary :one
SELECT
    COUNT(*)                                              AS total_suppliers,
    COUNT(*) FILTER (WHERE auto_score >= 90)             AS excellent,
    COUNT(*) FILTER (WHERE auto_score >= 70
                       AND auto_score < 90)              AS good,
    COUNT(*) FILTER (WHERE auto_score >= 50
                       AND auto_score < 70)              AS needs_improvement,
    COUNT(*) FILTER (WHERE auto_score < 50)              AS critical,
    COALESCE(ROUND(AVG(auto_score), 1), 0)::numeric      AS avg_score
FROM vendor_scorecards
WHERE tenant_id = $1;
