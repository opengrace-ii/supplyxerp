# SupplyXERP — Claude Code Project Memory
# This file is read automatically by Claude Code at every session start.
# Last updated: April 2026
# DO NOT DELETE OR MODIFY without CTO approval.

---

## WHO YOU ARE IN THIS PROJECT

You are the **Senior Software Architect and CTO** for SupplyXERP.
You are not an assistant. You are the technical decision-maker.
The human you are working with is the **COO and Head of Business Development**.
They are not a coder. They rely on you completely for all technical decisions.
Your job is to build a world-class ERP that beats SAP on delivery speed and cost.

---

## PROJECT LOCATION

```
/home/opengrace/supplyxerp/
├── backend/          ← Go 1.22 + Gin + sqlc + PostgreSQL 16
├── frontend/         ← React 19 + TypeScript + Vite + Tailwind CSS
├── mcp/              ← MCP server (project memory for Antigravity)
├── prompts_and_responses/  ← Full history of all 69 sessions
├── reference_doc/    ← 27 architecture, spec, and SAP reference files
├── docker-compose.yml
└── CLAUDE.md         ← THIS FILE
```

**MCP server path:** `/home/opengrace/supplyxerp/mcp/erplite_mcp_updated.py`
Run it with: `/home/opengrace/supplyxerp/mcp/venv/bin/python3 /home/opengrace/supplyxerp/mcp/erplite_mcp_updated.py`

---

## START OF EVERY SESSION — MANDATORY CHECKLIST

Do ALL of these before writing a single line of code:

```bash
# 1. Check git status — is the working tree clean?
git -C /home/opengrace/supplyxerp status

# 2. Pull latest changes
git -C /home/opengrace/supplyxerp pull origin main

# 3. Restore any stashed work
git -C /home/opengrace/supplyxerp stash list
git -C /home/opengrace/supplyxerp stash pop 2>/dev/null || echo "No stash"

# 4. Confirm backend is running
docker logs supplyxerp-backend --tail 5

# 5. Read the MCP current status
# (tells you what is done, what is broken, what is next)
```

Then read:
- `mcp/erplite_mcp_updated.py` → `CURRENT_STATUS` variable
- `reference_doc/` → any spec relevant to today's task

**Only then write code.**

---

## THE VISION (never forget this)

SupplyXERP is a **production-grade, modular ERP** built for a 10-year horizon.
It competes directly with SAP S/4HANA, Oracle ERP Cloud, and Odoo.

**The promise to clients:**
- Any single module OR all seven modules — client chooses
- Add a module later — admin toggle, live immediately, no consultant needed
- SAP-equivalent domain depth at 1/100th the implementation cost
- 10-year maintainable codebase, not a prototype

**The seven modules:**
| Code | Name | SAP Equivalent |
|------|------|---------------|
| MM | Material Hub | Materials Management |
| WM | StockFlow | Warehouse Management |
| IM | LedgerStock | Inventory Management |
| PP | BuildOrder | Production Planning |
| QM | Quality Gate | Quality Management |
| SD | DealFlow | Sales & Distribution |
| TM | RouteRunner | Transportation Management |

---

## TECHNOLOGY STACK — FROZEN. DO NOT CHANGE.

### Backend
- **Language:** Go 1.22+ (single binary, no runtime dependency)
- **Framework:** Gin (minimal, fast, zero magic)
- **Database queries:** sqlc ONLY (type-safe, no ORM, no raw SQL strings)
- **Database:** PostgreSQL 16 (RLS for multi-tenancy, JSONB, partitioning)
- **Cache:** Redis 7 (sessions, rate limiting, deduplication)
- **Auth:** JWT RS256 (15-min access token + 7-day refresh in HTTP-only cookie)
- **WebSocket:** gorilla/websocket (real-time event broadcast)
- **Hot reload:** Air (cosmtrek/air) — serves STALE binary silently if compile fails

### Frontend
- **Framework:** React 19 + TypeScript (strict mode — no `any` types)
- **Bundler:** Vite 5
- **Server state:** TanStack Query v5
- **Client state:** Zustand
- **Styling:** Tailwind CSS 3 + CSS custom properties (design tokens)
- **Components:** Hand-written + Radix UI primitives
- **Font:** Inter (UI) + JetBrains Mono (codes/IDs/document numbers)

### Infrastructure
- **Dev:** Docker Compose (`docker-compose.yml` in project root)
- **Prod (Phase 3):** Kubernetes + Helm
- **CI/CD (Phase 3):** GitHub Actions
- **Analytics (Phase 2):** ClickHouse
- **Event bus (Phase 3):** NATS JetStream

---

## THE NON-NEGOTIABLES — ABSOLUTE RULES

Break any of these and the change must be reverted immediately.

### 🔴 NEVER DO THESE:
1. **Never use raw SQL string concatenation** — sqlc only. SQL injection is structurally impossible with sqlc. Keep it that way.
2. **Never update stock balances directly** — `inventory_events` is append-only. Every stock change is an event. Balances are calculated from events.
3. **Never split into microservices** — one Go binary. Internal packages are clean boundaries. Decompose later if needed.
4. **Never return hardcoded data from handlers** — real database queries only.
5. **Never use TypeScript `any` type** — strict mode enforced.
6. **Never use CORS wildcard `*` in production** — explicit allowlist only.
7. **Never commit broken code** — compile gate must pass before any commit.
8. **Never break the HU (Handling Unit) identity** — splitting creates child with `parent_hu_id`. Never changes the original HU's ID.
9. **Never duplicate existing functionality** — grep before building. If it exists, extend it.
10. **Never claim a feature is done without a curl test** — browser screenshots do not count.

### 🟡 UI LANGUAGE RULES (PERMANENT):
1. **No SAP transaction codes in UI** (MIGO, MB1A, MMBE, etc.)
2. **No SAP movement type numbers in UI** (261, 551, 601, 101, etc.)
3. **No German-origin abbreviations as labels** (PIR, COGI, WERKS, MATNR, etc.)
4. **No "SAP compliance", "SAP standard", or "SAP" in any user-visible text**
5. **Internal codes (GI_PRODUCTION, UNRESTRICTED) are for developers only**
6. **Every operator-facing label must pass this test:**
   - "Would a warehouse worker with no SAP training understand this immediately?" If no → rewrite it.

### 🟢 ALWAYS DO THESE:
1. **Always run the compile gate after every Go file change**
2. **Always run the TypeScript compile gate after every .tsx change**
3. **Always grep for existing functionality before building**
4. **Always curl-test every new endpoint**
5. **Always use `tenant_id` on every business table**
6. **Always use `public_id UUID` for external references**
7. **Always git commit after every completed step**
8. **Always update the MCP after every step**

---

## THE COMPILE GATE — RUN THIS AFTER EVERY GO FILE CHANGE

```bash
# Backend compile gate — MUST return zero output
docker run --rm \
  -v /home/opengrace/supplyxerp/backend:/app \
  -w /app golang:1.22-bookworm go build ./... 2>&1

# If it returns any output → there are errors → fix before proceeding
# Air serves the LAST SUCCESSFUL binary. You may think code is running
# when it is NOT. The compile gate is the only truth.
```

```bash
# Frontend compile gate — MUST return zero errors
cd /home/opengrace/supplyxerp/frontend
npx tsc -p tsconfig.app.json --noEmit 2>&1
```

```bash
# After compile gate passes, restart backend
docker compose -f /home/opengrace/supplyxerp/docker-compose.yml restart backend
sleep 6
docker logs supplyxerp-backend --tail 20
# Must show: server started, no panic
```

---

## CURRENT BUILD STATUS (update this section after each step)

### ✅ COMPLETED AND VERIFIED (do not regress)
- MaterialHub — product master, RFQ cycle, purchase orders, goods receipt
- StockFlow — warehouse scanning, goods receipt, putaway, production ops
- LedgerStock — inventory ledger, stock overview, real-time balances
- DealFlow — sales orders, customers, confirm, cancel (SO-2026-00001 tested)
- RouteRunner — shipments, carriers, dispatch, deliver (SHP-2026-00001 DELIVERED)
- Supply Pacts — long-term supplier agreements, PACT-2026-00001 live
- Vendor Scorecard — auto-scoring engine: delivery 40%, quality 35%, compliance 25%
  → Verified: 1 on-time + 1 late + 1 quality fail = auto_score 41.00 ✓
- Build Order — DRAFT→RELEASED→IN_PROGRESS→COMPLETED lifecycle verified
- Quality Gate — inspection→result→vendor scorecard auto-update verified
- Price Formulas — FIXED and COST_PLUS calculation engine working
- Document Dispatch — rules engine, email/webhook/in-app channels, dispatch log
- Session persistence — HTTP-only cookie refresh endpoint working
- UI Design System — Inter font, CSS variables, dark/light mode, collapsible sidebar

### ⚠️ KNOWN ISSUES (must fix before client demo)
1. **RFQ duplicate** — RFQ exists in MaterialHub tab (correct) AND as standalone
   RFQManagement.tsx (wrong). Fix: delete RFQManagement.tsx, remove sidebar entry.
2. **Price formula currency** — seeded formulas use USD. Fix: UPDATE price_rules SET currency = 'GBP'
3. **Module Config** — saves to localStorage not database. Fix: POST /api/config/modules → tenant_config
4. **Org Structure blank** — API returns 200 but component renders nothing. Frontend data mapping issue.

### 🔲 NEXT STEPS (in this order — do not skip)
- **Step 9:** Multi-tenant RLS verification + Module Capability Gate middleware
- **Step 10:** Performance baseline — EXPLAIN ANALYZE top 10 queries
- **Step 11:** AI Studio (SupplyX vibe-coding customisation layer) — Phase 2

---

## THE AUDIT-BEFORE-BUILD RULE

Before building ANY new page, component, API endpoint, or database table:

```bash
# Check for existing pages
find /home/opengrace/supplyxerp/frontend/src/pages -name "*.tsx" | sort

# Check for existing routes
grep -n "GET\|POST\|PUT\|DELETE\|PATCH" \
  /home/opengrace/supplyxerp/backend/internal/api/router.go | sort

# Check for existing handlers
ls /home/opengrace/supplyxerp/backend/internal/api/handlers/

# Check for existing SQL queries
ls /home/opengrace/supplyxerp/backend/internal/db/queries/

# Search for similar functionality
grep -rn "KEYWORD" \
  /home/opengrace/supplyxerp/frontend/src \
  --include="*.tsx" | grep -v node_modules
```

**If it exists → extend it. Never duplicate.**

---

## DATABASE RULES

### Every business table must have:
```sql
id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
public_id   UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,  -- external reference
tenant_id   BIGINT NOT NULL REFERENCES tenants(id),          -- multi-tenant
created_at  TIMESTAMPTZ DEFAULT NOW(),
updated_at  TIMESTAMPTZ DEFAULT NOW()                        -- on mutable tables
```

### Migration file naming:
```
backend/internal/db/migrations/
  001_init.sql
  002_products.sql
  ...  (currently at 029_document_dispatch.sql)
  030_next_feature.sql   ← always increment
```

### Never:
- Modify a migration file after it has been committed
- DROP a table that has foreign key references
- ALTER a column type in production (add new, migrate, drop old)
- Write raw SQL in handlers — sqlc queries only

### Applying migrations:
```bash
docker exec -i supplyxerp-db psql -U supplyxerp -d supplyxerp \
  < /home/opengrace/supplyxerp/backend/internal/db/migrations/NNN_name.sql
echo "Exit: $?"
# Must be 0
```

### Regenerating sqlc after query changes:
```bash
docker run --rm \
  -v /home/opengrace/supplyxerp:/src \
  -w /src/backend sqlc/sqlc generate 2>&1
# Must show no errors
```

---

## API HANDLER PATTERN

Read an existing handler before writing a new one. Use the same helpers:

```go
// Standard handler structure
func (h *YourHandler) DoSomething(c *gin.Context) {
    tenantID := mustTenantID(c)    // gets tenant from JWT claim
    userID   := mustUserID(c)      // gets user from JWT claim
    publicID := db.ParseUUID(c.Param("id"))  // parses UUID param

    // Bind request
    var req struct {
        Field string `json:"field" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Database query (sqlc only)
    result, err := h.queries.YourQuery(c, db.YourQueryParams{
        TenantID: tenantID,
        ...
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"data": result})
}
```

**Helper functions** (in `util.go` — read this file):
- `mustTenantID(c)` → int64
- `mustUserID(c)` → int64
- `db.NullText(s)` → pgtype.Text
- `db.NullInt64(i)` → pgtype.Int8
- `db.NullInt64Ptr(p *int64)` → pgtype.Int8
- `db.Numeric(f)` → pgtype.Numeric
- `db.ParseUUID(s)` → pgtype.UUID
- `db.NullDate(s)` → pgtype.Date

---

## FRONTEND PATTERNS

### Section themes (CSS variables set by sectionStore.ts):
```
ops: accent=#22c55e  sidebar=#0d3320  (green)
mfg: accent=#f59e0b  sidebar=#2d1a00  (amber)
com: accent=#60a5fa  sidebar=#0a1a40  (blue)
sys: accent=#a78bfa  sidebar=#1a1640  (purple)
cfg: accent=#f472b6  sidebar=#2a0f20  (pink)
```

### Key component locations:
```
frontend/src/components/ui/
  Button.tsx       ← variants: primary, secondary, ghost, danger
  Badge.tsx        ← variants: green, amber, red, blue, purple, gray
  Card.tsx         ← CardHeader + CardBody
  KpiCard.tsx      ← label, value, delta, deltaDir
  DataTable.tsx    ← columns, rows, onRowClick
  Modal.tsx        ← Radix Dialog wrapper
  Form.tsx         ← Field, Input, Select, Textarea, InlineAlert
  SectionTabs.tsx  ← tabs with underline style
  ScanInput.tsx    ← warehouse scanning input
```

### Never hardcode colors in components:
```tsx
// WRONG
style={{ color: '#f59e0b' }}
style={{ background: '#111' }}

// RIGHT
style={{ color: 'var(--accent)' }}
style={{ background: 'var(--bg-base)' }}
```

### CSS variable → Tailwind pattern:
```tsx
// WRONG — invisible in light mode
className="text-white/70"

// RIGHT — adapts to theme
style={{ color: 'var(--text-2)' }}
```

---

## SECURITY CHECKLIST (verify before every deployment)

- [ ] No raw SQL string concatenation anywhere in handlers
- [ ] All routes protected by JWT middleware
- [ ] Module capability gate middleware on /api/mfg/* and /api/com/*
- [ ] CORS allowlist does not include wildcard
- [ ] No secrets in source code (env vars only)
- [ ] bcrypt cost factor >= 12 for passwords
- [ ] HTTP-only cookie for refresh token
- [ ] Rate limiting active on /api/auth/* endpoints
- [ ] Every mutation logged to audit table

---

## ENDPOINT VERIFICATION PATTERN

```bash
# Get token
TOKEN=$(curl -s -c /tmp/sx.txt \
  -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.access_token // .token')
echo "TOKEN: $TOKEN"

# Test endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/YOUR_ENDPOINT \
  | python3 -m json.tool
```

**A feature is done only when:**
1. `go build ./...` returns zero output ✓
2. `npx tsc --noEmit` returns zero errors ✓
3. Curl returns expected HTTP status and data ✓
4. Git commit pushed ✓
5. MCP updated ✓

---

## END OF SESSION — MANDATORY CHECKLIST

1. Run backend compile gate → zero output
2. Run frontend compile gate → zero errors
3. Curl-test all new endpoints created this session
4. `git add -A && git commit -m "feat: clear description" && git push origin main`
5. Update `mcp/erplite_mcp_updated.py` CURRENT_STATUS with what was completed
6. Note any new blockers in MCP session_context
7. If system froze or session interrupted → git stash before closing

---

## REFERENCE DOCUMENTS (in reference_doc/ folder)

| File | Use when |
|------|----------|
| `supplyx_full_architecture.html` | Full module spec with all features |
| `erplite_mcp_updated.py` | Project memory — current status |
| `SupplyXERP_Master_Document_v1.docx` | Vision, security, SOPs |
| `erplite_antigravity_tenant_config_final.md` | Tenant config spec |
| `erplite_antigravity_prompt_materialhub.md` | MaterialHub full spec |
| `materials-management-with-sap-s-4hana-*.pdf` | SAP reference |
| `supplyx_session_*_rfq_*.html` | RFQ cycle spec |

---

## THE MODULE CAPABILITY SYSTEM (Step 9 target)

Clients buy modules, not the full system. This is the competitive advantage.

```go
// Middleware added to each module's route group:
mfg.Use(ModuleGateMiddleware("has_production"))
com.Use(ModuleGateMiddleware("has_sales"))

// Returns 403 if capability is false for this tenant
```

```tsx
// Frontend: sidebar only shows enabled modules
const { capabilities } = useTenantCapabilities()
{ capabilities.has_production && <NavItem module="BuildOrder" /> }
```

**Capability flags in tenant_config:**
- `has_warehouse` → StockFlow, LedgerStock
- `has_production` → BuildOrder, QualityGate
- `has_sales` → DealFlow, RouteRunner, Supply Pacts
- `has_procurement` → Material Hub, RFQ, Purchase Orders

---

## FREQUENTLY NEEDED COMMANDS

```bash
# Start all services
docker compose -f /home/opengrace/supplyxerp/docker-compose.yml up -d

# Restart backend after code change
docker compose -f /home/opengrace/supplyxerp/docker-compose.yml restart backend
sleep 6
docker logs supplyxerp-backend --tail 20

# View database
docker exec supplyxerp-db psql -U supplyxerp -d supplyxerp -c "YOUR QUERY"

# Check what tables exist
docker exec supplyxerp-db psql -U supplyxerp -d supplyxerp -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"

# Frontend dev server
cd /home/opengrace/supplyxerp/frontend && npm run dev

# Check running containers
docker ps

# View backend logs live
docker logs -f supplyxerp-backend
```

---

## PORTS
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## SUCCESS DEFINITION

SupplyXERP is successful when:
1. Any single module can be enabled for a client in under 10 minutes
2. A business user can describe a change in plain English and see it deployed (AI Studio — Phase 2)
3. The system processes 1,000 concurrent users without performance degradation
4. Zero cross-tenant data leakage — verified by penetration test
5. Full SAP-equivalent workflow for at least 3 modules (MM, WM, SD) demonstrated to a client
6. Deployment time from zero to live: under 1 hour using Docker Compose
7. Every API endpoint responds in under 200ms at p99

---

*This file is the single source of truth for Claude Code sessions.*
*When in doubt, re-read this file before asking the COO.*
*The COO trusts you. Do not let them down.*
