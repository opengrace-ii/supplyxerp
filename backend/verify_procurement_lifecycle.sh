#!/bin/bash
set -e

echo "Starting Procurement Lifecycle Verification..."

# Configuration
API_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin123"
COOKIE_FILE="/tmp/procurement_cookies.txt"

# 1. Login
echo "Logging in as $ADMIN_USER..."
curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" > /dev/null

echo "✔ Logged in."

# 2. Setup: Ensure we have a product and a supplier
PROD_RES=$(curl -s -b "$COOKIE_FILE" "$API_URL/api/products")
PROD_ID=$(echo $PROD_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)
PROD_CODE=$(echo $PROD_RES | grep -o '"code":"[^"]*"' | head -n 1 | cut -d'"' -f4)

if [ -z "$PROD_ID" ]; then echo "FAILED to get Product ID"; exit 1; fi
echo "✔ Using Product: $PROD_CODE (ID $PROD_ID)"

SUP_RES=$(curl -s -b "$COOKIE_FILE" "$API_URL/api/suppliers")
SUP_ID=$(echo $SUP_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)

if [ -z "$SUP_ID" ]; then
  echo "Creating new supplier..."
  SUP_RES=$(curl -s -X POST "$API_URL/api/suppliers" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d "{\"code\":\"SUP-001\", \"name\":\"Test Vendor\", \"currency\":\"GBP\"}")
  SUP_ID=$(echo $SUP_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)
fi
echo "✔ Using Supplier: ID $SUP_ID"

# 3. Create PR (DRAFT)
echo "Creating Purchase Request..."
PR_RES=$(curl -s -X POST "$API_URL/api/purchase-requests" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"notes\":\"Lifecycle Test PR\", \"lines\":[{\"product_id\":$PROD_ID, \"quantity\":10, \"unit\":\"KG\", \"estimated_price\":10.00}]}")
PR_ID=$(echo $PR_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)
echo "✔ PR Created: ID $PR_ID (DRAFT)"

# 4. Submit PR
echo "Submitting PR..."
curl -s -X POST "$API_URL/api/purchase-requests/$PR_ID/submit" -b "$COOKIE_FILE" > /dev/null
PR_STATUS=$(curl -s -b "$COOKIE_FILE" "$API_URL/api/purchase-requests/$PR_ID" | jq -r '.purchase_request.status')
echo "✔ PR Status: $PR_STATUS"

if [ "$PR_STATUS" != "SUBMITTED" ]; then echo "FAILED: PR Status should be SUBMITTED"; exit 1; fi

# 5. Approve PR
echo "Approving PR..."
curl -s -X POST "$API_URL/api/purchase-requests/$PR_ID/approve" -b "$COOKIE_FILE" > /dev/null
PR_STATUS=$(curl -s -b "$COOKIE_FILE" "$API_URL/api/purchase-requests/$PR_ID" | jq -r '.purchase_request.status')
echo "✔ PR Status: $PR_STATUS"

if [ "$PR_STATUS" != "APPROVED" ]; then echo "FAILED: PR Status should be APPROVED"; exit 1; fi

# 6. Convert PR to PO
echo "Converting PR to PO..."
CONVERT_RES=$(curl -s -X POST "$API_URL/api/purchase-requests/$PR_ID/convert" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"supplier_id\":$SUP_ID}")
echo "CONVERT RES: $CONVERT_RES"
PO_ID=$(echo $CONVERT_RES | jq -r '.id // empty')

if [ -z "$PO_ID" ] || [ "$PO_ID" == "null" ]; then echo "FAILED to get PO ID from conversion"; exit 1; fi
echo "✔ PO Created: ID $PO_ID"

# 7. Check PR Status after conversion
PR_STATUS=$(curl -s -b "$COOKIE_FILE" "$API_URL/api/purchase-requests/$PR_ID" | jq -r '.purchase_request.status')
echo "✔ PR Status after conversion: $PR_STATUS"
if [ "$PR_STATUS" != "CONVERTED" ]; then echo "FAILED: PR Status should be CONVERTED"; exit 1; fi

# 8. Check PO Status
PO_STATUS=$(curl -s -b "$COOKIE_FILE" "$API_URL/api/purchase-orders/$PO_ID" | jq -r '.purchase_order.status')
echo "✔ PO Status: $PO_STATUS"

# 9. Final Verification: Approve PO
echo "Approving PO..."
curl -s -X POST "$API_URL/api/purchase-orders/$PO_ID/approve" -b "$COOKIE_FILE" > /dev/null
PO_STATUS=$(curl -s -b "$COOKIE_FILE" "$API_URL/api/purchase-orders/$PO_ID" | jq -r '.purchase_order.status')
echo "✔ Final PO Status: $PO_STATUS"

if [ "$PO_STATUS" != "APPROVED" ]; then echo "FAILED: PO Status should be APPROVED"; exit 1; fi

echo "✔ PROCURE-TO-PAY LIFECYCLE VERIFIED SUCCESSFULLY"
