-- name: GetSupplierByCode :one
SELECT * FROM suppliers WHERE tenant_id = $1 AND code = $2;

-- name: ListSuppliers :many
SELECT * FROM suppliers 
WHERE tenant_id = $1 AND is_active = true
ORDER BY code ASC
LIMIT $2 OFFSET $3;

-- name: CreateSupplier :one
INSERT INTO suppliers (
  tenant_id, code, name, contact_name, email, phone, currency, payment_terms_days, notes
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: UpdateSupplier :one
UPDATE suppliers 
SET name = $3, contact_name = $4, email = $5, phone = $6, currency = $7, payment_terms_days = $8, notes = $9, updated_at = now()
WHERE tenant_id = $1 AND id = $2
RETURNING *;

-- name: DeactivateSupplier :exec
UPDATE suppliers SET is_active = false, updated_at = now() WHERE tenant_id = $1 AND id = $2;

-- name: CreatePurchaseRequest :one
INSERT INTO purchase_requests (
  tenant_id, pr_number, status, required_by_date, notes, created_by,
  purchasing_group, cost_centre, priority, reference_doc, 
  decision_factor, pricing_breakdown
) VALUES (
  $1, $2, 'DRAFT', $3, $4, $5, $6, $7, $8, $9, $10, $11
) RETURNING *;

-- name: CreatePurchaseRequestLine :exec
INSERT INTO purchase_request_lines (
  tenant_id, pr_id, product_id, quantity, unit, estimated_price
) VALUES (
  $1, $2, $3, $4, $5, $6
);

-- name: ListPurchaseRequests :many
SELECT * FROM purchase_requests 
WHERE tenant_id = $1 AND ($2::text = '' OR status = $2)
ORDER BY created_at DESC;

-- name: GetPurchaseRequestWithLines :many
SELECT pr.*, 
       prl.product_id, prl.quantity, prl.unit, prl.estimated_price, 
       prl.preferred_supplier_id,
       prl.account_assignment_type, prl.cost_centre as cost_centre_line, prl.line_notes, prl.line_status,
       p.name as product_name, p.code as product_code
FROM purchase_requests pr
JOIN purchase_request_lines prl ON prl.pr_id = pr.id
JOIN products p ON p.id = prl.product_id
WHERE pr.tenant_id = $1 AND pr.id = $2;

-- name: UpdatePurchaseRequestStatus :exec
UPDATE purchase_requests 
SET status = $3, approved_by = $4, approved_at = CASE WHEN $3 = 'APPROVED' THEN now() ELSE approved_at END, updated_at = now()
WHERE tenant_id = $1 AND id = $2;

-- name: CreatePurchaseOrder :one
INSERT INTO purchase_orders (
  tenant_id, po_number, supplier_id, pr_id, status, currency, total_value, expected_delivery_date, notes, created_by, approved_by, approved_at,
  purchasing_org, purchasing_group, company_code, exchange_rate, payment_terms_days, incoterms, incoterms_location,
  goods_receipt_expected, invoice_expected, total_net_value, total_tax, total_gross_value, 
  rfq_id, supplier_ref, delivery_address, decision_factor, pricing_breakdown
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
) RETURNING *;

-- name: CreatePurchaseOrderLine :exec
INSERT INTO purchase_order_lines (
  tenant_id, po_id, product_id, quantity, unit, unit_price
) VALUES (
  $1, $2, $3, $4, $5, $6
);

-- name: ListPurchaseOrders :many
SELECT po.*, s.name as supplier_name, s.code as supplier_code
FROM purchase_orders po
JOIN suppliers s ON s.id = po.supplier_id
WHERE po.tenant_id = $1 AND ($2::text = '' OR po.status = $2)
ORDER BY po.created_at DESC;

-- name: GetPurchaseOrderWithLines :many
SELECT po.*, 
       pol.id as line_id, pol.product_id, pol.quantity, pol.unit, pol.unit_price, pol.line_value, pol.qty_received, 
       pol.account_assignment_type, pol.cost_centre as cost_centre_line, pol.line_notes, pol.line_status,
       p.name as product_name, p.code as product_code, s.name as supplier_name
FROM purchase_orders po
JOIN purchase_order_lines pol ON pol.po_id = po.id
JOIN products p ON p.id = pol.product_id
JOIN suppliers s ON s.id = po.supplier_id
WHERE po.tenant_id = $1 AND po.id = $2;

-- name: UpdatePurchaseOrderLineReceived :exec
UPDATE purchase_order_lines
SET qty_received = qty_received + $3
WHERE tenant_id = $1 AND id = $2;

-- name: UpdatePurchaseOrderStatus :exec
UPDATE purchase_orders
SET status = $3, updated_at = now()
WHERE tenant_id = $1 AND id = $2;

-- name: GetApprovalThresholds :one
SELECT flat_po_threshold, flat_pr_threshold, default_currency, approval_mode
FROM tenant_config
WHERE tenant_id = $1;
