-- name: CreateCustomer :one
INSERT INTO customers (
    tenant_id, code, name, email, phone,
    address, city, country, currency, payment_terms, credit_limit
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
)
RETURNING *;

-- name: ListCustomers :many
SELECT * FROM customers
WHERE tenant_id = $1 AND is_active = true
ORDER BY name ASC;

-- name: GetCustomerByID :one
SELECT * FROM customers
WHERE id = $1 AND tenant_id = $2;

-- name: CreateSalesOrder :one
INSERT INTO sales_orders (
    tenant_id, customer_id, order_date,
    requested_date, currency, notes, created_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: AddSalesOrderLine :one
INSERT INTO sales_order_lines (
    sales_order_id, line_number, material_id,
    description, quantity, unit_of_measure,
    unit_price, discount_pct
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: ListSalesOrders :many
SELECT
    so.*,
    c.name  AS customer_name,
    c.code  AS customer_code,
    c.email AS customer_email,
    (SELECT COUNT(*) FROM sales_order_lines sol
     WHERE sol.sales_order_id = so.id) AS line_count
FROM sales_orders so
JOIN customers c ON c.id = so.customer_id
WHERE so.tenant_id = $1
ORDER BY so.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetSalesOrderWithLines :one
SELECT
    so.*,
    c.name  AS customer_name,
    c.code  AS customer_code,
    c.email AS customer_email
FROM sales_orders so
JOIN customers c ON c.id = so.customer_id
WHERE so.public_id = $1 AND so.tenant_id = $2;

-- name: GetSalesOrderLines :many
SELECT
    sol.*,
    m.code AS material_code,
    m.name AS material_name
FROM sales_order_lines sol
LEFT JOIN products m ON m.id = sol.material_id
WHERE sol.sales_order_id = $1
ORDER BY sol.line_number;

-- name: ConfirmSalesOrder :one
UPDATE sales_orders
SET status       = 'CONFIRMED',
    confirmed_at = NOW(),
    confirmed_by = $2,
    updated_at   = NOW()
WHERE id = $1
  AND status = 'DRAFT'
  AND tenant_id = $3
RETURNING *;

-- name: UpdateSalesOrderStatus :one
UPDATE sales_orders
SET status     = $2,
    updated_at = NOW()
WHERE id = $1 AND tenant_id = $3
RETURNING *;

-- name: CancelSalesOrder :one
UPDATE sales_orders
SET status     = 'CANCELLED',
    updated_at = NOW()
WHERE id = $1
  AND status IN ('DRAFT', 'CONFIRMED')
  AND tenant_id = $2
RETURNING *;

-- name: GetDealFlowDashboard :one
SELECT
    COUNT(*)                                              AS total_orders,
    COUNT(*) FILTER (WHERE status = 'DRAFT')             AS draft,
    COUNT(*) FILTER (WHERE status = 'CONFIRMED')         AS confirmed,
    COUNT(*) FILTER (WHERE status = 'DISPATCHED')        AS dispatched,
    COUNT(*) FILTER (WHERE status = 'DELIVERED')         AS delivered,
    COUNT(*) FILTER (WHERE status = 'CANCELLED')         AS cancelled,
    COALESCE(SUM(total_amount)
      FILTER (WHERE status != 'CANCELLED'), 0)           AS total_revenue,
    COALESCE(SUM(total_amount)
      FILTER (WHERE status = 'CONFIRMED'), 0)            AS pending_value,
    COALESCE(AVG(total_amount)
      FILTER (WHERE status != 'CANCELLED' AND status != 'DRAFT'), 0) AS avg_order_value
FROM sales_orders
WHERE tenant_id = $1
  AND created_at >= NOW() - INTERVAL '90 days';
