# SupplyX ERP — User Guide and Standard Operating Procedures
# Version: Phase 1 (Current)
# Audience: Operators, warehouse managers, administrators
# Last updated: April 2026

---

## WHAT IS ERPLITE

SupplyX ERP is a warehouse and inventory management system built for small
and mid-scale industries. It tracks every physical material movement as a
verified digital event. Nothing is assumed. Nothing is overwritten.
Every action leaves a permanent record.

The system is modelled on SAP S/4HANA but designed to be operated by
a warehouse worker with a barcode scanner, not a consultant.

---

## HOW TO OPEN THE SYSTEM

1. Open your web browser (Chrome or Firefox recommended)
2. Go to: http://localhost:5173 (or the address your IT team provides)
3. Enter your username and password
4. Click Login

You will see the main SupplyX ERP screen with the navigation ribbon at the top.

---

## THE NAVIGATION RIBBON

The five tabs at the top change the entire colour theme and sidebar:

| Tab | Colour | What it contains |
|-----|--------|------------------|
| OPERATIONS | Green | StockFlow (warehouse scanning), LedgerStock (stock ledger) |
| MFG | Amber | MaterialHub (products), BuildOrder (production), QualityGate |
| COMMERCE | Blue | DealFlow (sales orders), RouteRunner (shipments) |
| SYSTEM | Purple | Audit log, Users and roles |
| CONFIG | Pink | Tenants, Org structure, Module config, Setup |

Click a tab — the sidebar on the left changes to show only that section's modules.

---

## PART 1 — OPERATIONS

### StockFlow (Warehouse Management)

StockFlow is the daily operational screen for warehouse staff.
It handles scanning, receiving goods, moving stock, and production floor operations.

#### Mode Tabs

StockFlow has four operating modes:

**Receiving** — Use when goods arrive from a supplier.
- Scan the delivery note or supplier barcode
- Enter the quantity received
- The system creates a Handling Unit (HU) and posts a Goods Receipt event

**Production** — Use when goods move from storage to the production floor.
- Scan the HU barcode
- Choose: Move (relocate HU), Split (take a portion), or Consume (use the material)

**Putaway** — Use after receiving, to move goods from the receiving area to storage.
- Scan the HU
- Select the destination storage zone
- Confirm the move

**Dispatch** — Use when sending goods to customers (Phase 3 — coming soon).

#### Scanning an HU

1. Click in the scan input field (it auto-focuses when you open StockFlow)
2. Scan the barcode or type the HU code (e.g. HU-2026-00001)
3. Press Enter or click Scan
4. The HU information card appears showing: product name, quantity, location, status
5. The Agent Activity panel on the right shows each verification step as it runs

#### Creating a Goods Receipt (receiving goods)

1. Switch to Receiving mode
2. Enter the product code (e.g. FAB-001) or scan the supplier barcode
3. Enter quantity and unit (e.g. 315 KG)
4. Select the receiving zone (usually RECV-01)
5. Optionally enter a supplier reference (delivery note number)
6. Click Post Receipt
7. The system creates a new HU with a generated code, posts the event to the ledger,
   and creates a Putaway task to move the goods to storage

#### Splitting an HU

Splitting is used when you need to take part of an HU for production.
Example: you have a 315 KG roll of fabric but production only needs 50 KG.

1. Scan the HU (e.g. HU-2026-00001, 315 KG)
2. Switch to Production mode
3. Click Split
4. Enter the split quantity (50)
5. The preview shows: Parent will have 265 KG, child will have 50 KG
6. Click Execute Split
7. The system creates a new child HU (e.g. HU-2026-00002) with 50 KG
8. The parent HU retains its code and now shows 265 KG
9. Both HUs are independently trackable

#### Consuming an HU

Consuming marks material as used in production. If you consume only part
of an HU, the system automatically splits it first.

1. Scan the HU
2. Click Consume
3. Enter the quantity consumed
4. If partial (less than the full HU): the system splits first, then consumes the child
5. The consumed HU status changes to CONSUMED and disappears from stock counts
6. The parent HU retains the remainder

#### Moving an HU

1. Scan the HU
2. Click Move
3. Select the destination zone from the dropdown
4. Click Execute Move
5. The HU's location updates immediately

#### Agent Activity Panel

Every time you scan or perform an operation, the Agent Activity panel
on the right shows what the system is doing:

| Agent | What it checks |
|-------|---------------|
| BarcodeAgent | Decodes the barcode and finds the matching entity |
| ErrorPreventionAgent | Checks for duplicate scans and invalid operations |
| InventoryAgent | Fetches or updates the HU record |
| PricingAgent | Resolves the current price for the material |
| AuditAgent | Records the action in the permanent audit log |

GREEN = success. AMBER = blocked (operation not allowed). RED = failed.

---

### LedgerStock (Inventory Management)

LedgerStock is the stock ledger — a complete history of every movement
of every material in the warehouse. No number is ever changed or deleted.
Every stock count is calculated from the sum of events.

#### Stock Overview

Shows current stock levels per product and per zone.
- Total quantity in each zone
- Last movement date
- Click any row to see the full movement history for that product

#### Movement History

A chronological list of every inventory event:
- Time of event
- Event type (GR, MOVE, CONSUME, SPLIT, etc.)
- HU code affected
- Quantity change (positive = in, negative = out)
- Zone
- Who performed the action

Use the filters to narrow down by date range, event type, or product.

#### Stock Alerts

Flags items that need attention:
- HUs sitting in a receiving zone for more than 24 hours (not putaway)
- HUs with zero or negative calculated quantity
- Blocked HUs pending quality inspection

---

## PART 2 — MFG (MANUFACTURING)

### MaterialHub (Materials Management)

MaterialHub is the product master — the catalogue of all materials
your company works with. Every Handling Unit in StockFlow references
a product in MaterialHub.

#### Viewing products

Click MFG → MaterialHub. You see a table of all registered products with:
- Code (unique identifier, e.g. FAB-001)
- Name (full description)
- Base unit of measure (KG, IMP, QTY, etc.)
- Active/Inactive status

Use the search bar to filter by code or name.

#### Adding a new product

1. Click "+ Add Product"
2. Enter:
   - Code: Short identifier (e.g. FAB-001). Will be auto-uppercased.
     Rules: 2-20 characters, letters, numbers, and hyphens only.
   - Name: Full name (e.g. Fabric Roll 150 TC)
   - Base Unit: Select from KG, IMP, QTY, LTR, MTR, PCS
   - Description: Optional notes about the material
3. Click Save Product
4. The Agent Activity panel shows the creation steps
5. The product appears in the table immediately without page refresh

#### Editing a product

Click the pencil icon on any product row.
You can change: Name, Description, and UOM conversions.
You cannot change: Code or Base Unit (these are locked after creation to
protect data integrity).

#### Registering supplier barcodes

Each product can have multiple supplier barcodes registered.
This allows the system to resolve a supplier's barcode to your internal product.

1. Click Edit on a product
2. Click the Barcodes tab
3. Type the supplier barcode in the input field
4. Press Enter
5. The barcode is registered — scanning it in StockFlow will now show this product

#### UOM Conversions

If your product is received in one unit but used in another:
1. Click Edit on a product
2. Click the UOM Conversions tab
3. Click "+ Add conversion"
4. Set: From unit → To unit → Factor
   Example: KG → QTY → factor 1000 (1 KG = 1000 pieces)
5. Save

---

### BuildOrder (Production Planning) — Phase 2

Coming in Phase 2. Will cover:
- Production orders
- Bill of Materials (BOM)
- Planned vs actual consumption tracking

### QualityGate (Quality Management) — Phase 2

Coming in Phase 2. Will cover:
- Automatic inspection lots triggered by goods receipts
- Pass/fail decisions that move stock between quality categories

---

## PART 3 — SYSTEM

### Audit Log

A complete, permanent record of every action performed in the system.
No entry is ever deleted or modified.

Columns: Timestamp | User | Action | Entity | Before state | After state

Use filters to find specific events:
- Filter by user (who did it)
- Filter by action type (what was done)
- Date range

### Users and Roles

Manage who has access to ERPLite and what they can do.

#### Roles

| Role | What they can do |
|------|-----------------|
| ADMIN | Everything, including user management and system reset |
| WAREHOUSE_MANAGER | All operational functions, view audit log |
| OPERATOR | Scan, receive, move, split, consume |
| VIEWER | Read-only — can see stock and events but not change anything |

#### Adding a user

1. Click SYSTEM → Users & roles
2. Click "+ Add User"
3. Enter username, email, and temporary password
4. Select role
5. Click Save

#### Changing a role

Click the role badge on any user row → select new role → Save.
Role changes take effect immediately on next login.

---

## PART 4 — CONFIG

### Tenants

A tenant is one company using ERPLite. If you are running ERPLite for
multiple companies, each gets their own tenant with completely separate data.

Shows: Company name | Slug (URL identifier) | Created date | Status

To add a tenant: Click "+ Add Tenant" → enter name → slug is auto-generated.

### Org Structure

The physical layout of your warehouse, represented as:
- Organisation (your company)
  - Site (a physical warehouse location)
    - Zones (areas within the warehouse)

#### Zone types

| Zone | Purpose |
|------|---------|
| RECEIVING | Where goods arrive. HUs start here after a Goods Receipt. |
| STORAGE | Where goods are held between receipt and use. |
| PRODUCTION | Where goods are consumed or processed. |
| DISPATCH | Where goods are staged for outbound delivery. |

HUs can only be consumed from STORAGE or PRODUCTION zones.
HUs cannot be moved back to RECEIVING after leaving it.

### Setup

Configuration for how ERPLite behaves for your specific industry.

#### Domain Profile

Select the profile that best matches your business:

| Profile | Best for | Key defaults |
|---------|----------|-------------|
| GENERAL | Any industry | Balanced defaults |
| MANUFACTURING | Factories | Batch tracking, production zones |
| DISTRIBUTION | Logistics | Purchasing, dispatch focus |
| RETAIL | Shops | PCS units, fast receiving |
| PHARMA | Medicine | Expiry tracking, FIFO mandatory |
| TEXTILE | Fabric/apparel | KG/MTR units, colour variants |
| CONSTRUCTION | Building | Project-linked materials |
| FOOD | Food production | Expiry mandatory, FIFO |

Selecting a profile applies sensible defaults. It does not restrict what
you can do — it simply sets the starting configuration.

#### Number Sequences

Control how document numbers are generated.

Format templates:
- `GR-{YEAR}-{SEQ}` produces: GR-2026-00001
- `REC/{SEQ}/{YEAR}` produces: REC/00001/2026

To change the starting number: enter the new starting value and click
[Apply]. The system will confirm the next document number. The sequence
can only go forward — you cannot set a starting number lower than the
highest existing document number.

#### Data Migration

For importing data from a previous system.

**Products CSV import:**
Download the template → fill in your product list → upload.
Each row: code, name, base_unit, description.

**Opening Balances CSV import:**
Import your existing stock as OPENING_BALANCE events.
Each row: product_code, quantity, unit, zone_code, as_of_date.
This does not bypass the ledger — each opening balance is a formal event.

**Go-live date:**
Set the date your company starts using ERPLite for live operations.
Events before this date are historical records. Events after this date
are live operations.

---

## EMERGENCY PROCEDURES

### What to do if the system shows "Offline"

The red dot means the browser cannot reach the backend server.
1. Wait 30 seconds — the system tries to reconnect automatically
2. If still offline: contact your IT administrator
3. Do not close the browser — open operations will resume when reconnected

### What to do if you scan an HU and get "BLOCKED"

The amber BLOCKED status means the operation is not allowed in the
current state. Common reasons:
- Duplicate scan: you scanned the same barcode within 5 seconds. Wait and try again.
- Wrong zone: trying to consume from a receiving zone. Move the HU to production first.
- Wrong mode: trying to consume in Putaway mode. Switch to Production mode.

The agent panel will show exactly which agent blocked the operation and why.

### What to do if a product won't save

1. Check the code: must be 2-20 characters, uppercase, letters/numbers/hyphens only
2. Check for duplicates: the same code cannot be used twice in your tenant
3. Check the unit: must be one of KG, IMP, QTY, LTR, MTR, PCS

---

## GLOSSARY

| Term | Meaning |
|------|---------|
| HU | Handling Unit — a physical container of goods with a barcode |
| GR | Goods Receipt — the formal record of goods arriving |
| Event | An immutable record of a stock movement |
| Ledger | The append-only record of all events (like an accounting ledger) |
| Split | Dividing an HU into a parent (remainder) and child (portion taken) |
| Consume | Using material in production — the HU is marked CONSUMED |
| Zone | An area within a warehouse (RECEIVING, STORAGE, PRODUCTION, DISPATCH) |
| Putaway | Moving goods from receiving to storage after a goods receipt |
| Agent | A system component that performs one specific verification or action |
| Trace | The visible log of agent steps shown during any operation |
