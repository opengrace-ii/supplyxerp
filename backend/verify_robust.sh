#!/bin/bash
set -e

echo "Starting Phase 3: Purchasing Suite Verification (Robust)..."

# 1. Login
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"admin","password":"admin123"}' > /dev/null

echo "✔ Logged in."

# 2. Create Supplier
RAND_ID=$RANDOM
SUPPLIER_RES=$(curl -s -X POST http://localhost:8080/api/suppliers \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"code\":\"SUP-TEST-$RAND_ID\", \"name\":\"Robust Vendor $RAND_ID\", \"currency\":\"GBP\", \"contact_name\":\"Jane Doe\", \"email\":\"jane@robust.com\"}")
echo "SUPPLIER RES: $SUPPLIER_RES"
SUPPLIER_ID=$(echo $SUPPLIER_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)

if [ -z "$SUPPLIER_ID" ]; then echo "FAILED to get Supplier ID"; exit 1; fi
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
  -d "{\"notes\":\"Robust PR\", \"lines\":[{\"product_id\":$PROD_ID, \"quantity\":100, \"unit\":\"KG\", \"estimated_price\":5.50}]}")
echo "PR RES: $PR_RES"
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
echo "PO RES: $PO_RES"
PO_ID=$(echo $PO_RES | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)

if [ -z "$PO_ID" ]; then echo "FAILED to get PO ID"; exit 1; fi
echo "✔ Purchase Order Generated: ID $PO_ID"

# 7. Get PO Line ID
PO_DETAIL=$(curl -s -b cookies.txt http://localhost:8080/api/purchase-orders/$PO_ID)
echo "PO DETAIL: $PO_DETAIL"
PO_LINE_ID=$(echo $PO_DETAIL | grep -o '"line_id":[0-9]*' | head -n 1 | cut -d: -f2)

if [ -z "$PO_LINE_ID" ]; then echo "FAILED to get PO Line ID"; exit 1; fi
echo "✔ Found PO Line: ID $PO_LINE_ID"

# 8. Post Goods Receipt (GR) linked to PO
ZONE_ID=1

GR_RES=$(curl -s -X POST http://localhost:8080/api/gr \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"product_id\":$PROD_ID, \"quantity\":60, \"unit\":\"KG\", \"zone_id\":$ZONE_ID, \"po_id\":$PO_ID, \"po_line_id\":$PO_LINE_ID, \"notes\":\"Robust receipt\", \"supplier_ref\":\"ROB-001\"}")

echo "GR RES: $GR_RES"
echo "✔ Goods Receipt Posted."

# 9. Verify PO Line Received Qty
FINAL_PO=$(curl -s -b cookies.txt http://localhost:8080/api/purchase-orders/$PO_ID)
RECEIVED_QTY=$(echo $FINAL_PO | grep -o '"qty_received":[0-9.]*' | head -n 1 | cut -d: -f2)

echo "Final Verification:"
echo "Received Qty: $RECEIVED_QTY"

if [ "$RECEIVED_QTY" == "60" ] || [ "$RECEIVED_QTY" == "60.0000" ]; then
  echo "✔ VERIFICATION SUCCESSFUL"
else
  echo "✖ VERIFICATION FAILED: Qty mismatch (Expected 60, got $RECEIVED_QTY)"
  exit 1
fi
