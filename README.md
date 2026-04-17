# SupplyX ERP

SupplyX ERP is a production-grade monolithic ERP-lite control system with transparent agent execution.

## Stack

- Backend: Go + Gin + PostgreSQL
- Real-time stream: WebSocket (`/ws`)
- Frontend: React + Vite + TypeScript
- Infra: Docker Compose (hot reload)

## Architecture

`UI -> API -> Service -> Agent -> Event -> DB -> WebSocket -> UI`

- HU (Handling Unit) is the core entity.
- All operations execute through domain agents.
- Every request creates an `execution_trace` with ordered `execution_trace_steps`.
- Every step is persisted and streamed live as `agent_trace`.

## Agents

1. Inventory Agent
2. Barcode Agent
3. Warehouse Agent
4. Production Agent
5. Labeling Agent
6. Pricing Agent
7. Audit Agent
8. Error Prevention Agent

## Required Endpoints

- `POST /scan`
- `POST /move`
- `POST /consume`
- `GET /inventory`
- `GET /trace/:id`
- `GET /ws` (WebSocket)

Auth:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Seed Data

Products:
- Fabric Roll (KG)
- Laminate (IMP)

Handling Units:
- HU-1001 (315 KG)
- HU-1002 (21.16 IMP)

User:
- admin / admin123

## Run

```bash
docker compose up --build
```

Open: `http://localhost:5173`

## Real-Time Verification

1. Login as `admin/admin123`.
2. Enter `HU-1001`.
3. Click `Scan`.
4. Live Agent Activity panel shows streamed steps (SUCCESS/FAILED/BLOCKED).
5. Result and inventory update immediately without page refresh.

## Notes

- Duplicate scan prevention uses a short scan lock window.
- Stock is mutation-safe through event-driven updates (`hu_events`) and lineage-preserving split logic.
- Audit logs persist every mutation path.
