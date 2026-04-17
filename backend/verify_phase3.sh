#!/bin/bash
set -e

echo "Starting Phase 3: Purchasing Suite Verification..."

# 1. Login
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"admin","password":"admin123"}' > /dev/null

echo "✔ Logged in."

# 2. Create Supplier
SUPPLIER_RES=$(curl -s -X POST http://localhost:8080/api/suppliers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"code":"SUP-TEST-1", "name":"Global Logistics Corp", "currency":"GBP", "contact_name":"John Doe", "email":"john@globlog.com"}')
SUPPLIER_ID=$(echo $SUPPLIER_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)

echo "✔ Supplier Created: ID $SUPPLIER_ID"

# 3. Get first product
PROD_RES=$(curl -s -b cookies.txt http://localhost:8080/api/products)
PROD_ID=$(echo $PROD_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)
PROD_CODE=$(echo $PROD_RES | grep -o '"code":"[^"]*"' | head -n 1 | cut -d'"' -f4)

echo "✔ Found Product: $PROD_CODE (ID $PROD_ID)"

# 4. Create Purchase Request (PR)
PR_RES=$(curl -s -X POST http://localhost:8080/api/purchase-requests \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"notes\":\"Test PR\", \"lines\":[{\"product_id\":$PROD_ID, \"quantity\":100, \"unit\":\"KG\", \"estimated_price\":5.50}]}")
PR_ID=$(echo $PR_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)

echo "✔ Purchase Request Created: ID $PR_ID"

# 5. Approve PR
curl -s -X POST http://localhost:8080/api/purchase-requests/$PR_ID/approve \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status":"APPROVED"}' > /dev/null

echo "✔ PR Approved."

# 6. Convert PR to Purchase Order (PO)
PO_RES=$(curl -s -X POST http://localhost:8080/api/purchase-orders \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"supplier_id\":$SUPPLIER_ID, \"pr_id\":$PR_ID, \"currency\":\"GBP\", \"lines\":[{\"product_id\":$PROD_ID, \"quantity\":100, \"unit\":\"KG\", \"unit_price\":5.40}]}")
PO_ID=$(echo $PO_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)
PO_NUMBER=$(echo $PO_RES | grep -o '"po_number":"[^"]*"' | head -n 1 | cut -d'"' -f4)

echo "✔ Purchase Order Generated: $PO_NUMBER (ID $PO_ID)"

# 7. Get PO Line ID
PO_DETAIL=$(curl -s -b cookies.txt http://localhost:8080/api/purchase-orders/$PO_ID)
PO_LINE_ID=$(echo $PO_DETAIL | grep -o '"id":[0-9]*' | tail -n 1 | cut -d: -f2)

echo "✔ Found PO Line: ID $PO_LINE_ID"

# 8. Post Goods Receipt (GR) linked to PO
ZONE_RES=$(curl -s -b cookies.txt http://localhost:8080/api/org-tree)
ZONE_ID=$(echo $ZONE_RES | grep -o '"id":[0-9]*' | head -n 20 | tail -n 1 | cut -d: -f2)

GR_RES=$(curl -s -X POST http://localhost:8080/api/gr \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"product_id\":$PROD_ID, \"quantity\":60, \"unit\":\"KG\", \"zone_id\":$ZONE_ID, \"po_id\":$PO_ID, \"po_line_id\":$PO_LINE_ID, \"notes\":\"Partial Receipt from PO\"}")

echo "GR RESPONSE: $GR_RES"

echo "✔ Goods Receipt Posted (Partial: 60/100)."

# 9. Verify PO Line Received Qty
FINAL_PO=$(curl -s -b cookies.txt http://localhost:8080/api/purchase-orders/$PO_ID)
RECEIVED_QTY=$(echo $FINAL_PO | grep -o '"qty_received":"[^"]*"' | head -n 1 | cut -d'"' -f4)
STATUS=$(echo $FINAL_PO | grep -o '"status":"[^"]*"' | head -n 1 | cut -d'"' -f4)

echo "Final Verification:"
echo "PO Status: $STATUS"
echo "Received Qty: $RECEIVED_QTY"

if [[ "$RECEIVED_QTY" == *"60"* ]]; then
  echo "✔ VERIFICATION SUCCESSFUL"
else
  echo "✖ VERIFICATION FAILED: Qty mismatch"
  exit 1
fi
