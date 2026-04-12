# ERPLite — Production-Grade ERP Rewrite

This plan rewrites the existing ERPLite codebase to conform fully to the SAP EWM–style spec. The current code provides a useful skeleton (~40% coverage) but has critical architectural gaps requiring systematic resolution.

## User Review Required

> [!IMPORTANT]
> **Go Module Path**: The spec requires `github.com/opengrace/erplite`, but the existing codebase uses `erplite/backend`. Changing this means updating every import in every Go file. **Recommended**: Keep `erplite/backend` since it's already working in Docker and rename is cosmetic. Please confirm.

> [!IMPORTANT]
> **Multi-tenancy**: The spec demands `tenant_id` on every table with row-level security. The current schema has no tenant concept. Adding this touches every table, every query, and every API call. **This is a ~4-hour addition on top of the core work.** We'll add it, but seed data will operate under a single `techlogix` tenant.

> [!WARNING]
> **HU Split Logic is Fundamentally Wrong**: The current production agent **closes the parent HU** and creates two children (consumed + remainder). The spec requires the **parent to retain its ID** with updated (reduced) quantity, and only create one child HU. This is the #1 critical fix.

> [!IMPORTANT]
> **Redis vs DB for Idempotency**: The spec requires Redis for duplicate scan detection. The current code uses a PostgreSQL `scan_locks` table. We'll add Redis while keeping the DB fallback path.

> [!IMPORTANT]
> **JWT Algorithm**: Spec says RS256, current is HS256. RS256 requires key pair management. **Recommended**: Stay with HS256 for dev simplicity (the spec says "generate key pair at startup if not present" which we can do, but adds complexity with no security benefit in a single-binary monolith). Please confirm preference.

---

## Gap Analysis Summary

| Area | Current State | Spec Requirement | Gap Severity |
|------|--------------|-----------------|--------------|
| Schema PKs | UUID primary keys | `GENERATED ALWAYS AS IDENTITY` + `public_id` UUID | 🔴 High |
| Multi-tenancy | None | `tenant_id` on every table + RLS | 🔴 High |
| HU Split logic | Parent closed, 2 children created | Parent updated in-place, 1 child created | 🔴 Critical |
| `locations` table | No table, strings only | Full `locations` table with capacity | 🟡 Medium |
| Redis idempotency | DB-based scan_locks | Redis SET with TTL | 🟡 Medium |
| Agent interface | Direct method calls | `Agent` interface with `Execute()` | 🟡 Medium |
| Structured logging | `log` package | `log/slog` | 🟡 Medium |
| Response envelope | Bare JSON | `{ success, data, trace, error }` | 🟡 Medium |
| Missing endpoints | No `/api/split`, `/api/locations` | Full endpoint set | 🟡 Medium |
| Seed data | HU-1001 at RECV-01 | HU-1001 at STOR-01 | 🟢 Low |
| Frontend: Zustand/TanStack | Raw useState | Zustand + TanStack Query | 🟡 Medium |
| Frontend: Tailwind | Vanilla CSS | Tailwind CSS CDN | 🟡 Medium |
| Unit tests | None | Required for split, barcode, dedup | 🔴 High |

---

## Proposed Changes

Changes are organized by agent responsibility and ordered by dependency chain.

---

### Phase 1: Schema (Agent 1)

Complete rewrite of the migration to match spec requirements.

#### [MODIFY] [001_init.sql](file:///home/opengrace/erplite/backend/db/migrations/001_init.sql)

The existing migration at `backend/internal/db/migrations/001_init.sql` will be moved to `backend/db/migrations/001_init.sql` (spec folder structure). 

Key changes:
- Add `tenants` table with seed `techlogix`
- Change all PKs from UUID to `GENERATED ALWAYS AS IDENTITY` with `public_id UUID` secondary column
- Add `tenant_id` to every table with foreign key to `tenants`
- Add `locations` table with zones/aisles/bins/capacity
- Add `roles`, `user_roles` tables
- Add `product_units`, `batches` tables
- Rename `hu_events` → `inventory_events` with monthly range partitions
- Rename `handling_units` columns to match spec (add `label_version`)
- Add `price_versions` (replacing `pricing_history`)
- Add `execution_traces` with proper UUID `trace_id`
- Add RLS policies (enabled but permissive for dev)
- Fix all FK `ON DELETE` rules
- Add SQL comments for every nullable column
- Fix seed data:
  - HU-1001: 315 KG Fabric at **STOR-01** (not RECV-01)
  - HU-1002: 21.16 IMP Laminate at **STOR-02** (not RECV-02)
  - 4 locations: RECV-01, STOR-01, STOR-02, PROD-01
  - Admin user with bcrypt hash
  - Price versions for both products

---

### Phase 2: Infrastructure (Agent 5)

#### [MODIFY] [docker-compose.yml](file:///home/opengrace/erplite/docker-compose.yml)

- Add `redis` service (redis:7-alpine, port 6379, healthcheck)
- Update `postgres` service to postgres:16-alpine, mount migrations from `./backend/db/migrations`
- Add `REDIS_ADDR` env to backend
- Add `VITE_WS_BASE` env to frontend
- Change DB password to `erplite_dev_pass`
- Add `JWT_SECRET` as `dev_jwt_secret_change_in_prod`
- Add healthchecks for all services

#### [MODIFY] [Dockerfile.dev](file:///home/opengrace/erplite/backend/Dockerfile.dev)

- Keep air-based hot reload (current approach is correct)
- Add Redis client tools for debugging

#### [MODIFY] [Dockerfile.dev](file:///home/opengrace/erplite/frontend/Dockerfile.dev)

- Ensure `--host 0.0.0.0` is in dev command

---

### Phase 3: Domain Layer (Agent 2)

#### [MODIFY] [models.go](file:///home/opengrace/erplite/backend/internal/domain/models.go)

- Update all models to use `int64` PKs + `string` PublicIDs
- Add `TenantID int64` to all models
- Add `LabelVersion int` to HU struct
- Add `Location` struct with zone/aisle/bin/capacity
- Add `Tenant`, `Role`, `UserRole` models
- Add `Batch`, `ProductUnit` models
- Add `HUStatusInUse` constant
- Keep existing status constants

#### [NEW] [events.go](file:///home/opengrace/erplite/backend/internal/domain/events/events.go)

- Define domain event types: `GoodsReceiptPosted`, `HUSplit`, `HUMoved`, `HUConsumed`, `HURelabeled`
- Each event carries before/after state

#### [NEW] [errors.go](file:///home/opengrace/erplite/backend/internal/domain/errors/errors.go)

- `ErrDuplicateScan`, `ErrInsufficientStock`, `ErrHUNotFound`, `ErrInvalidQuantity`, `ErrHUNotMutable`, `ErrNotImplemented`
- Replace current `utils.AppError` with typed domain errors

#### [NEW] [agent.go](file:///home/opengrace/erplite/backend/internal/domain/agent.go)

- Define `Agent` interface with `Name()` and `Execute(ctx, AgentRequest) (AgentResult, error)`
- Define `AgentRequest`, `AgentResult` types
- Define `CtxTraceKey` context key

---

### Phase 4: Agents (Agent 2)

All 8 agent packages will be updated to implement the `Agent` interface while keeping their existing direct-call methods for internal use by services.

#### [MODIFY] [barcode/agent.go](file:///home/opengrace/erplite/backend/internal/agent/barcode/agent.go)

- Implement `Agent` interface
- Add `Execute()` method that dispatches to Decode/Resolve/Validate
- Add Redis-based duplicate scan check alongside DB fallback

#### [MODIFY] [inventory/agent.go](file:///home/opengrace/erplite/backend/internal/agent/inventory/agent.go)

- Implement `Agent` interface
- Fix: HU split must **update parent in place** (reduce quantity, increment `label_version`), create **one child** with `parent_hu_id`
- Never close/destroy parent identity

#### [MODIFY] [production/agent.go](file:///home/opengrace/erplite/backend/internal/agent/production/agent.go)

🔴 **CRITICAL FIX** — Complete rewrite of split/consume logic:
```
Before (WRONG):
  Parent → SPLIT_CLOSED (qty=0)
  + Child-Consumed (qty=consumeQty)
  + Child-Remainder (qty=remainderQty)

After (CORRECT per spec):
  Parent → updated in-place (qty = originalQty - consumeQty, label_version++)
  + Child (qty=consumeQty, status=IN_USE, location=PROD-01, parent_hu_id=Parent.id)
```

- `ConsumeWithSplit` → Update parent HU quantity in place, create single child HU
- `SplitOnly` → Same pattern: parent keeps reduced qty, child gets split qty
- Remove remainder HU concept entirely
- All mutations go through `inventory_events`

#### [MODIFY] [warehouse/agent.go](file:///home/opengrace/erplite/backend/internal/agent/warehouse/agent.go)

- Implement `Agent` interface
- Add task confirmation flow (opened_at/confirmed_at)

#### [MODIFY] [labeling/agent.go](file:///home/opengrace/erplite/backend/internal/agent/labeling/agent.go)

- Implement `Agent` interface
- Add `GenerateLabel()` method that increments `label_version` on HU
- Never creates new HU identity

#### [MODIFY] [pricing/agent.go](file:///home/opengrace/erplite/backend/internal/agent/pricing/agent.go)

- Implement `Agent` interface

#### [MODIFY] [audit/agent.go](file:///home/opengrace/erplite/backend/internal/agent/audit/agent.go)

- Implement `Agent` interface
- Ensure `payload_before`/`payload_after` never contain passwords, JWT tokens, or raw internal IDs

#### [MODIFY] [errorprevention/agent.go](file:///home/opengrace/erplite/backend/internal/agent/errorprevention/agent.go)

- Implement `Agent` interface
- Add Redis-based idempotency: `SCAN:{tenant_id}:{barcode}` with 5s TTL
- Add operation idempotency: `OP:{tenant_id}:{hu_public_id}:{operation}` with 30s TTL
- Add `CheckDuplicateScan()` using Redis

---

### Phase 5: Repository & Config (Agent 3 + Agent 6)

#### [MODIFY] [base.go](file:///home/opengrace/erplite/backend/internal/repository/base.go)

- Add `LocationRepository` to UnitOfWork

#### [NEW] [location_repository.go](file:///home/opengrace/erplite/backend/internal/repository/location_repository.go)

- `ListAll(ctx)` — returns all locations with HU counts
- `GetByCode(ctx, code)` — single location lookup

#### [MODIFY] [hu_repository.go](file:///home/opengrace/erplite/backend/internal/repository/hu_repository.go)

- Update all queries for new schema (int64 PKs, tenant_id)
- Add `IncrementLabelVersion()` method

#### [MODIFY] All other repositories

- Update for new schema column names and types

#### [MODIFY] [config.go](file:///home/opengrace/erplite/backend/internal/config/config.go)

- Add `RedisAddr` field
- Add `DB_DSN` env var (alias for `DATABASE_URL`)

#### [NEW] [redis.go](file:///home/opengrace/erplite/backend/internal/db/redis.go)

- Redis client initialization using `github.com/redis/go-redis/v9`

---

### Phase 6: Service Layer (Agent 3)

#### [MODIFY] [operation_service.go](file:///home/opengrace/erplite/backend/internal/service/operation_service.go)

- Add Redis client dependency
- Fix consume flow to use corrected split logic
- Add `Split()` method (separate from consume) 
- Broadcast each agent step over WebSocket **as it executes** (already done partially)
- Return full execution trace in response body
- Add `inventory_update` WebSocket broadcast after mutations

#### [MODIFY] [query_service.go](file:///home/opengrace/erplite/backend/internal/service/query_service.go)

- Add `ListLocations()` method
- Add `GetAuditPaginated()` method

---

### Phase 7: API Layer (Agent 3)

#### [MODIFY] [router.go](file:///home/opengrace/erplite/backend/internal/api/router.go)

- Add `POST /api/split` endpoint
- Add `GET /api/locations` endpoint
- Add `GET /api/audit` with admin-only middleware
- Fix route paths to use `/api/` prefix consistently
- Wire RBAC: OPERATOR+ for mutations, ADMIN for audit, VIEWER+ for reads

#### [MODIFY] [operation_handler.go](file:///home/opengrace/erplite/backend/internal/api/handlers/operation_handler.go)

- Add `Split()` handler
- Wrap all responses in spec envelope: `{ success, data, trace, error }`

#### [MODIFY] [query_handler.go](file:///home/opengrace/erplite/backend/internal/api/handlers/query_handler.go)

- Add `ListLocations()` handler
- Wrap all responses in spec envelope
- Add pagination for audit log

#### [MODIFY] [response.go](file:///home/opengrace/erplite/backend/internal/api/handlers/response.go)

- Create standardized response envelope helper
- `respondSuccess(c, data, trace)` and `respondError(c, err)` using spec format

#### [NEW] [logging.go](file:///home/opengrace/erplite/backend/internal/api/middleware/logging.go)

- `log/slog` structured logging middleware
- Every request logs: `trace_id`, `tenant_id`, `actor_id`, `method`, `path`, `status`, `duration_ms`

#### [MODIFY] [main.go](file:///home/opengrace/erplite/backend/cmd/server/main.go)

- Initialize Redis connection
- Initialize slog with JSON handler
- Pass Redis client to OperationService
- Add structured startup logging

---

### Phase 8: Frontend (Agent 4)

> [!IMPORTANT]
> The spec requests Tailwind CSS via CDN. The current codebase uses carefully crafted vanilla CSS that already looks good. **Recommendation**: Since the spec says "CDN, no build step for Tailwind in dev", we'll add the Tailwind CDN script to `index.html` and migrate styles incrementally. The visual design will be enhanced significantly regardless.

#### [MODIFY] [package.json](file:///home/opengrace/erplite/frontend/package.json)

- Add: `zustand`, `@tanstack/react-query`, `axios`
- Update React to 19

#### [NEW] [store/useAppStore.ts](file:///home/opengrace/erplite/frontend/src/store/useAppStore.ts)

- Zustand store: `currentHU`, `currentMode`, `traceSteps`, `wsStatus`, `inventory`, `locations`

#### [NEW] [hooks/useWebSocket.ts](file:///home/opengrace/erplite/frontend/src/hooks/useWebSocket.ts)

- WebSocket connection with exponential backoff (max 5s)
- Handles `agent_trace` and `inventory_update` events
- Auto-reconnect on disconnect

#### [NEW] [hooks/useScan.ts](file:///home/opengrace/erplite/frontend/src/hooks/useScan.ts)

- Scan logic: call API, update store, handle errors

#### [MODIFY] [api/client.ts](file:///home/opengrace/erplite/frontend/src/api/client.ts)

- Convert to axios with interceptors
- Add typed methods for all endpoints including `/api/split`, `/api/locations`, `/api/audit`
- Add proper error handling with typed errors

#### [MODIFY] [pages/DashboardPage.tsx → pages/OperatorPage.tsx](file:///home/opengrace/erplite/frontend/src/pages/DashboardPage.tsx)

- Rename to `OperatorPage.tsx`
- Rewire to use Zustand store instead of local state
- Use TanStack Query for data fetching

#### [NEW] [components/ScanInput.tsx](file:///home/opengrace/erplite/frontend/src/components/ScanInput.tsx)

- Dedicated scan input component with auto-focus and Enter key handling

#### [NEW] [components/ActionButtons.tsx](file:///home/opengrace/erplite/frontend/src/components/ActionButtons.tsx)

- Mode-filtered action buttons with tooltip explanations for disabled state

#### [NEW] [components/HUCard.tsx](file:///home/opengrace/erplite/frontend/src/components/HUCard.tsx)

- HU detail card with product info, qty, UoM, location, status badge

#### [NEW] [components/LineageTree.tsx](file:///home/opengrace/erplite/frontend/src/components/LineageTree.tsx)

- Visual lineage tree showing parent/child relationships

#### [NEW] [components/TraceRow.tsx](file:///home/opengrace/erplite/frontend/src/components/TraceRow.tsx)

- Single trace step row with color-coded status and fade-in animation

#### [NEW] [components/InventoryGrid.tsx](file:///home/opengrace/erplite/frontend/src/components/InventoryGrid.tsx)

- Grid of location cards showing HU counts and status

#### [NEW] [components/LocationCard.tsx](file:///home/opengrace/erplite/frontend/src/components/LocationCard.tsx)

- Individual location card with HU listing

#### [MODIFY] [components/OperationPanel.tsx](file:///home/opengrace/erplite/frontend/src/components/OperationPanel.tsx)

- Mode-specific disabled tooltips: "Not available in Putaway mode"
- Inline quantity input for consume (not modal overlay per spec... but current modal UX is better — will keep modal but ensure it's clearly part of the consume flow)

#### [MODIFY] [components/AgentTracePanel.tsx](file:///home/opengrace/erplite/frontend/src/components/AgentTracePanel.tsx)

- Auto-scroll to latest trace row
- Fade-in animation for new rows
- Spec color system: SUCCESS=green-600/green-50, FAILED=red-600/red-50, BLOCKED=amber-600/amber-50

#### Visual Design Upgrade

- Add Tailwind CDN to `index.html`
- Dark mode support with premium color palette
- Glassmorphism panels
- Smooth micro-animations
- Google Fonts (Inter)

---

### Phase 9: Security & Observability (Agent 6)

#### [MODIFY] [jwt.go](file:///home/opengrace/erplite/backend/internal/security/jwt.go)

- Keep HS256 (pending user confirmation on RS256)
- Add refresh token generation (7-day, HTTP-only Secure SameSite=Strict cookie)
- Claims: `sub`, `tenant_id`, `roles[]`, `iat`, `exp`
- No sensitive fields in claims

#### [MODIFY] [auth.go](file:///home/opengrace/erplite/backend/internal/api/middleware/auth.go)

- Add RBAC middleware with role hierarchy: ADMIN > WAREHOUSE_MANAGER > OPERATOR > VIEWER
- POST mutations → OPERATOR+
- GET /api/audit → ADMIN only
- GET reads → VIEWER+

#### [NEW] [idempotency.go](file:///home/opengrace/erplite/backend/internal/security/idempotency.go)

- Redis-based idempotency check functions
- `CheckScanIdempotency(ctx, tenantID, barcode)` — 5s TTL
- `CheckOpIdempotency(ctx, tenantID, huPublicID, op)` — 30s TTL

---

### Phase 10: Tests

#### [NEW] Backend test files

- `internal/agent/inventory/agent_test.go` — Test `Split` with correct parent-retains-identity logic
- `internal/agent/barcode/agent_test.go` — Test `Resolve` with various barcode formats
- `internal/agent/errorprevention/agent_test.go` — Test `CheckDuplicateScan` 5-second window
- `internal/service/operation_service_test.go` — Integration tests for scan/consume/move flows

---

## Open Questions

> [!IMPORTANT]
> 1. **Go module path**: Keep `erplite/backend` or change to `github.com/opengrace/erplite`? (Recommendation: keep current)
> 2. **JWT algorithm**: HS256 (simpler) or RS256 (spec-required)? (Recommendation: HS256)
> 3. **Consume UX**: The spec says "inline quantity input (not a modal overlay)" but the current modal provides better UX. Keep modal? 

---

## Verification Plan

### Automated Tests
```bash
# Backend
docker compose exec backend go build ./...
docker compose exec backend go test ./...
docker compose exec backend go vet ./...

# Frontend
docker compose exec frontend npm run typecheck
docker compose exec frontend npm run build
```

### Manual Verification (Success Criteria walkthrough)
1. `docker compose up --build` — all services start healthy
2. Open `http://localhost:5173` — login with `admin / admin123`
3. Select **Production** mode
4. Type `HU-1001` in scanner → press Enter
5. Verify Context Panel: Product=Fabric Roll, Qty=315 KG, Location=STOR-01, Status=AVAILABLE
6. Verify Agent Trace shows 5 steps in order
7. Click **Consume** → enter 50 → confirm
8. Verify Context Panel: HU-1001 now 265 KG (parent updated in place!)
9. Verify child HU created with 50 KG at PROD-01
10. Scan `HU-1001` again immediately → DUPLICATE_SCAN:BLOCKED in red
11. Switch to Putaway → Consume/Split disabled with tooltip
12. `GET /api/hus/HU-1001/lineage` — parent + child with correct quantities

### Browser Testing
- Use browser subagent to walk through the full success criteria flow
- Record video of the complete operator workflow
