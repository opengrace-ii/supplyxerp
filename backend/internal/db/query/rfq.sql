-- RFQ Document Queries

-- name: CreateRFQ :one
INSERT INTO rfq_documents (
    tenant_id, rfq_number, status, rfq_type, collective_number, 
    document_date, deadline_date, validity_start, validity_end,
    apply_by_date, binding_days, purchasing_org_code, purchasing_group_code,
    your_reference, our_reference, salesperson, telephone, language_key,
    notes, created_by
) VALUES (
    $1, $2, 'DRAFT', $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
) RETURNING *;

-- name: UpdateRFQHeader :one
UPDATE rfq_documents
SET
    deadline_date = $3,
    collective_number = $4,
    validity_start = $5,
    validity_end = $6,
    apply_by_date = $7,
    binding_days = $8,
    notes = $9,
    your_reference = $10,
    our_reference = $11,
    salesperson = $12,
    telephone = $13,
    updated_at = now()
WHERE id = $1 AND tenant_id = $2 AND status = 'DRAFT'
RETURNING *;

-- name: CreateRFQLine :one
INSERT INTO rfq_lines (
    tenant_id, rfq_id, line_number, product_id, short_text, quantity, unit, 
    delivery_date, item_category, storage_location, material_group,
    req_tracking_no, planned_deliv_days, reason_for_order, has_schedule
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
) RETURNING *;

-- name: GetRFQLines :many
SELECT l.*, p.code as product_code, p.name as product_name,
       (SELECT COUNT(*) FROM rfq_quotation_lines ql WHERE ql.rfq_line_id = l.id) as quote_count
FROM rfq_lines l
LEFT JOIN products p ON l.product_id = p.id
WHERE l.rfq_id = $1 AND l.tenant_id = $2
ORDER BY l.line_number ASC;

-- name: UpdateRFQLine :one
UPDATE rfq_lines
SET
    quantity = $3,
    unit = $4,
    delivery_date = $5,
    planned_deliv_days = $6,
    reason_for_order = $7,
    storage_location = $8,
    short_text = $9,
    updated_at = now()
WHERE rfq_lines.id = $1 AND rfq_lines.tenant_id = $2
AND NOT EXISTS (SELECT 1 FROM rfq_quotation_lines WHERE rfq_line_id = rfq_lines.id)
RETURNING *;

-- name: CreateRFQVendor :exec
INSERT INTO rfq_vendors (
    tenant_id, rfq_id, supplier_id, status
) VALUES (
    $1, $2, $3, 'PENDING'
) ON CONFLICT (rfq_id, supplier_id) DO NOTHING;

-- name: ListRFQs :many
SELECT r.*, 
       (SELECT COUNT(*) FROM rfq_lines WHERE rfq_id = r.id) as line_count,
       (SELECT COUNT(*) FROM rfq_vendors WHERE rfq_id = r.id) as vendor_count,
       (SELECT COUNT(*) FROM rfq_vendors WHERE rfq_id = r.id AND quote_received = true) as quotes_received
FROM rfq_documents r
WHERE r.tenant_id = $1 
  AND ($2::text = '' OR r.status = $2)
  AND (sqlc.narg('collective_number')::text IS NULL OR r.collective_number = sqlc.narg('collective_number'))
ORDER BY r.created_at DESC;

-- name: GetRFQ :one
SELECT * FROM rfq_documents WHERE id = $1 AND tenant_id = $2;

-- name: GetRFQVendors :many
SELECT v.*, s.name as vendor_name, s.code as vendor_code
FROM rfq_vendors v
JOIN suppliers s ON v.supplier_id = s.id
WHERE v.rfq_id = $1 AND v.tenant_id = $2;

-- name: UninviteRFQVendor :exec
DELETE FROM rfq_vendors 
WHERE rfq_vendors.rfq_id = $1 AND rfq_vendors.supplier_id = $2 AND rfq_vendors.tenant_id = $3
AND NOT EXISTS (SELECT 1 FROM rfq_quotations WHERE rfq_vendor_id = rfq_vendors.id);

-- name: UpdateRFQStatus :exec
UPDATE rfq_documents
SET status = $3, updated_at = now()
WHERE tenant_id = $1 AND id = $2;

-- Quotation Queries

-- name: CreateRFQQuotation :one
INSERT INTO rfq_quotations (
    tenant_id, rfq_vendor_id, document_date, valid_to, status, 
    total_value, currency, your_reference, warranty_terms
) VALUES (
    $1, $2, $3, $4, 'SUBMITTED', $5, $6, $7, $8
) RETURNING *;

-- name: CreateRFQQuotationLine :exec
INSERT INTO rfq_quotation_lines (
    tenant_id, quotation_id, rfq_line_id, quantity_offered, 
    gross_price, discount_pct, discount_amount, freight_value,
    tax_code, tax_amount, effective_price,
    delivery_date_offered, notes, pricing_steps
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
);

-- name: GetRFQQuotations :many
SELECT q.*, s.name as vendor_name, s.public_id as vendor_public_id, s.code as vendor_code
FROM rfq_quotations q
JOIN rfq_vendors v ON q.rfq_vendor_id = v.id
JOIN suppliers s ON v.supplier_id = s.id
WHERE v.rfq_id = $1 AND q.tenant_id = $2;

-- name: GetRFQQuotationLines :many
SELECT ql.*, rl.line_number, rl.product_id, rl.short_text, rl.unit as rfq_unit
FROM rfq_quotation_lines ql
JOIN rfq_lines rl ON ql.rfq_line_id = rl.id
WHERE ql.quotation_id = $1 AND ql.tenant_id = $2;

-- name: RejectQuotationLine :exec
UPDATE rfq_quotation_lines
SET is_rejected = true, rejection_reason = $3, rejection_sent_at = NULL
WHERE id = $1 AND tenant_id = $2;

-- name: MarkRejectionSent :exec
UPDATE rfq_quotation_lines
SET rejection_sent_at = now()
WHERE quotation_id IN (
    SELECT id FROM rfq_quotations 
    WHERE rfq_vendor_id IN (
        SELECT id FROM rfq_vendors WHERE rfq_id = $1 AND supplier_id = ANY($2::bigint[])
    )
) AND is_rejected = true;

-- name: FinaliseRFQStatus :exec
UPDATE rfq_quotations
SET status = CASE WHEN rfq_quotations.id = $1 THEN 'ACCEPTED' ELSE 'REJECTED' END
WHERE rfq_vendor_id IN (SELECT id FROM rfq_vendors WHERE rfq_id = $2);

-- name: UpdateRFQFinalised :exec
UPDATE rfq_documents
SET status = 'FINALISED', finalised_by = $3, finalised_at = now()
WHERE rfq_documents.id = $1 AND rfq_documents.tenant_id = $2;

-- name: UpdateRFQWinnerVendor :exec
UPDATE rfq_vendors
SET is_selected = true
WHERE rfq_id = $1 AND supplier_id = $2 AND tenant_id = $3;
