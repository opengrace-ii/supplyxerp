-- name: ListDispatchRules :many
SELECT * FROM dispatch_rules
WHERE tenant_id = $1
ORDER BY trigger_event, channel;

-- name: GetDispatchRulesByEvent :many
SELECT * FROM dispatch_rules
WHERE tenant_id = $1
  AND trigger_event = $2
  AND is_active = true;

-- name: CreateDispatchRule :one
INSERT INTO dispatch_rules (
    tenant_id, rule_name, trigger_event, channel,
    recipient_type, recipient_value,
    subject_template, body_template
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateDispatchRule :one
UPDATE dispatch_rules
SET is_active      = $2,
    recipient_value = COALESCE($3, recipient_value),
    updated_at     = NOW()
WHERE id = $1 AND tenant_id = $4
RETURNING *;

-- name: LogDispatch :one
INSERT INTO dispatch_logs (
    tenant_id, dispatch_rule_id,
    trigger_event, reference_type, reference_id, reference_code,
    channel, recipient, subject, status, error_message, sent_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: ListDispatchLogs :many
SELECT
    dl.*,
    dr.rule_name
FROM dispatch_logs dl
LEFT JOIN dispatch_rules dr ON dr.id = dl.dispatch_rule_id
WHERE dl.tenant_id = $1
ORDER BY dl.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetDispatchSummary :one
SELECT
    COUNT(*)                                           AS total_dispatched,
    COUNT(*) FILTER (WHERE status = 'SENT')            AS sent,
    COUNT(*) FILTER (WHERE status = 'FAILED')          AS failed,
    COUNT(*) FILTER (WHERE status = 'PENDING')         AS pending,
    COUNT(*) FILTER (WHERE channel = 'EMAIL'
                      AND status = 'SENT')             AS emails_sent,
    COUNT(*) FILTER (WHERE channel = 'WEBHOOK'
                      AND status = 'SENT')             AS webhooks_sent,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS last_24h
FROM dispatch_logs
WHERE tenant_id = $1;
