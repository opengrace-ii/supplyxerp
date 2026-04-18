#!/usr/bin/env python3
"""
ERPLite MCP Server — Updated April 2026
========================================
Project memory for the ERPLite build.
Provides structured context to every AI session to prevent drift.

IMPORTANT: Update get_current_status after every significant build session.
The AI reads this at session start. If it is wrong, the AI builds wrong.

Install: pip install mcp
Run:     python3 erplite_mcp.py
"""

import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("erplite-context")

VISION = """
ERPLite Vision (Source of Truth — Do Not Override)
===================================================
ERPLite is a production-grade, industry-agnostic ERP system for small and
mid-scale industries who cannot afford SAP but deserve the same operational
discipline. It is modelled on SAP S/4HANA MM, EWM, IM, PP, QM, SD, and TM.

Core philosophy:
- Every material movement = a verified digital event (never a balance update)
- Handling Units (HU) are the primary entity — not products, not stock counts
- Agents make every system decision visible to the operator
- The developer judges by what they see on localhost:5173
- One binary. One database. One correct model from day one.

The developer is the CTO-client: 17 years COO of a freight auditing company,
SAP MM certified (2012), has built standalone Ubuntu apps used by 100+ staff.
They navigate by what they SEE, not by reading code.
This is not a prototype. It is a 10-year production system.
"""

UI_SPEC = {
    "version": "1.0 — FROZEN",
    "spec_file": "/home/opengrace/erplite/reference_doc/erplite_ui_spec_v1.md",
    "theme_system": {
        "OPS":  {"dark": "#0d3320", "accent": "#22c55e", "light": "rgba(22,163,74,0.06)",   "label": "Operations"},
        "MFG":  {"dark": "#2d1a00", "accent": "#f59e0b", "light": "rgba(245,158,11,0.06)",  "label": "Manufacturing"},
        "COM":  {"dark": "#0a1a40", "accent": "#60a5fa", "light": "rgba(96,165,250,0.06)",  "label": "Commerce"},
        "SYS":  {"dark": "#1a1640", "accent": "#a78bfa", "light": "rgba(167,139,250,0.06)", "label": "System"},
        "CFG":  {"dark": "#2a0f20", "accent": "#f472b6", "light": "rgba(244,114,182,0.06)", "label": "Config"},
    },
    "layout": "top-bar(46px) + sidebar(210px) + working-area(flex:1, bg:#111)",
    "shell_bg": "#111",
    "ribbon": "OPERATIONS | MFG | COMMERCE | SYSTEM | CONFIG — inside top bar",
    "trace_location": "Inline below scanner in working area — NOT a right-side panel",
    "working_area_bg": "#111 — NEVER changes with theme",
    "sidebar_bg": "section dark colour — changes when ribbon tab clicked",
    "rule": "Dark ribbon tab + dark sidebar = same colour. Working area = #111 always.",
}

TECH_STACK = {
    "backend": {
        "language": "Go 1.22",
        "framework": "Gin",
        "db_queries": "sqlc (type-safe, no ORM)",
        "database": "PostgreSQL 16",
        "cache": "Redis 7",
        "websocket": "gorilla/websocket",
        "hot_reload": "Air (cosmtrek/air)",
        "auth": "JWT RS256, 15min access + 7day refresh in HTTP-only cookie",
        "security": "RBAC middleware, prepared statements only",
        "logging": "log/slog (stdlib, structured)",
        "path": "/home/opengrace/erplite/backend",
    },
    "frontend": {
        "framework": "React 19 + TypeScript (strict mode)",
        "bundler": "Vite 5",
        "state": "Zustand",
        "server_state": "TanStack Query v5",
        "styling": "CSS custom properties only",
        "path": "/home/opengrace/erplite/frontend",
    },
    "infra": "Docker Compose — postgres + redis + backend + frontend",
    "non_negotiables": [
        "No raw SQL string concatenation — sqlc only",
        "No direct stock balance updates — inventory_events append only",
        "No HU identity breaks — split creates child with parent_hu_id",
        "No microservices — one Go binary",
        "No V1/V2 phasing — correct model from day one",
        "No placeholder functions — every function does real work",
        "No hidden agents — every step broadcasts via WebSocket",
        "TypeScript strict mode — no any types",
        "After every Go file edit: run go build ./... and confirm zero errors",
        "After every feature: curl test every affected route before claiming done",
    ],
    "critical_rule_air": "Air hot-reload silently serves stale binary when build fails. ALWAYS verify with: docker run --rm -v /home/opengrace/erplite/backend:/app -w /app golang:1.22-bookworm go build ./... 2>&1 — this cannot use a stale binary.",
}

AGENTS = {
    "BarcodeAgent":         "Decode → resolve barcode to entity (HU/Product/Location) → validate not duplicate scan",
    "ErrorPreventionAgent": "Duplicate scan check (Redis 5s TTL), invalid state transitions, constraint enforcement",
    "InventoryAgent":       "HU lifecycle: create, fetch, split, merge, close. Updates quantity via events only.",
    "WarehouseAgent":       "Task creation and confirmation: putaway, move, pick. Never moves stock directly.",
    "ProductionAgent":      "Consumption: full and partial. Calls InventoryAgent.Split internally.",
    "LabelingAgent":        "Label generation with version increment. NEVER creates new HU identity.",
    "PricingAgent":         "Effective-date pricing lookup. Returns price valid on the requested date.",
    "AuditAgent":           "Append-only audit log. Records before+after state for every mutation.",
}

DB_SCHEMA_RULES = {
    "pk_rule": "BIGINT GENERATED ALWAYS AS IDENTITY for all PKs. Never SERIAL. Never UUID as PK.",
    "public_id_rule": "Every table gets UUID public_id (DEFAULT gen_random_uuid()) for API exposure. API responses use public_id only, never internal integer PK.",
    "tenant_rule": "Every table gets tenant_id BIGINT REFERENCES tenants(id). Row-level security at DB level.",
    "stock_rule": "NEVER a balance column. Stock = SUM of inventory_events. Use PostgreSQL VIEW for snapshots.",
    "hu_identity_rule": "handling_units.id never changes. Split: parent keeps ID + label_version++. Child gets new ID with parent_hu_id = parent.id.",
    "event_rule": "inventory_events is append-only. No UPDATE, no DELETE. Ever. Partition by created_at monthly.",
    "fk_rule": "All foreign keys must have explicit ON DELETE rule with SQL comment explaining the choice.",
    "compile_gate": "After every file edit: docker run --rm -v /home/opengrace/erplite/backend:/app -w /app golang:1.22-bookworm go build ./... — must return zero output before continuing.",
}

CURRENT_STATUS = {
    "phase": "Phase 1 — Core Operations",
    "last_updated": "April 2026 — post recovery session",

    "verified_working": [
        "Docker Compose stack starts (postgres + redis + backend + frontend)",
        "Backend compiles cleanly — go build ./... returns zero errors",
        "JWT login — admin/admin123 returns token in HTTP-only cookie",
        "WebSocket hub — /ws endpoint accepts connections",
        "Frontend shell — ribbon nav, colour themes, sidebar per section",
        "Products can be created and saved (curl verified + browser verified)",
        "Database schema — all tables exist including org hierarchy, tenant_config",
        "Goods Receipt (GR) — POST /api/gr verified end-to-end via CURL and psql",
        "StockFlow production ops — move/split/consume verified end-to-end via CURL",
        "Tenant config — Load config and Apply Domain Profile verified",
        "Warehouse tasks — PUTAWAY / COMPLETE verified end-to-end",
        "Barcode registration verified",
    ],

    "broken_needs_fix": [
        "Org Structure screen — clicking it shows blank working area. Frontend component exists but is not rendering data. Check: does GET /api/orgs return data? Is the component correctly mapped in AppPage.tsx routing?",
        "Session persistence — page refresh logs user out. JWT refresh token is not being sent on page reload. Check: useWebSocket or auth hook must call GET /api/auth/me on mount using the existing cookie.",
    ],

    "unverified_needs_recheck": [
        "MaterialHub UOM conversions — built during stale binary period. Recheck product edit + UOM tab.",
    ],

    "not_started": [
        "LedgerStock — stock overview view, movement history table, real-time event stream display",
        "MaterialHub purchasing — purchase orders, PO lines, supplier mapping, PO-referenced GR",
    ],

    "next_prompt": "Fix Org Structure blank screen + session persistence logout. Then build LedgerStock.",

    "build_sequence_remaining": [
        "1. Fix Org Structure + session persistence (current blockers)",
        "2. LedgerStock: stock overview + movement ledger (real-time from inventory_events)",
        "3. MaterialHub purchasing: PO creation → GR link",
        "4. BuildOrder: production orders + BOM",
        "5. QualityGate: inspection lots auto-triggered by events",
        "6. DealFlow: sales orders + pricing engine",
        "7. RouteRunner: shipments + carrier integration",
    ],
}

SAP_CONCEPTS = {
    "Handling_Unit": "Physical container of goods. Has quantity, unit, location, status. Can be split (parent→children) or merged. Identity never changes — only label_version increments on relabel.",
    "Material_Document": "Record of a goods movement. In ERPLite = entry in inventory_events.",
    "Movement_Type": "SAP code for kind of stock change (101=GR, 261=GI to production, 311=transfer). In ERPLite = event_type field.",
    "Storage_Bin": "Physical location within warehouse. In ERPLite = zones table (zone_type: RECEIVING/STORAGE/PRODUCTION/DISPATCH).",
    "Warehouse_Task": "Instruction to move goods from source to destination. In ERPLite = warehouse_tasks table. Never moves stock directly.",
    "Goods_Receipt": "Formal posting of inbound goods. In ERPLite = gr_documents table + GR event in inventory_events + HU creation.",
    "MRP": "Material Requirements Planning. Phase 2 — BuildOrder module.",
    "Valuation": "Monetary value of stock. In ERPLite = price_versions table with valid_from/valid_to.",
    "Batch": "Lot of material with shared characteristics. Optional in ERPLite, schema-ready.",
    "Plant": "SAP manufacturing/storage unit. In ERPLite = sites table within org hierarchy.",
    "Purchasing_Organisation": "SAP buying entity. In ERPLite = tenant-level config, Phase 2.",
}

BUILD_SEQUENCE = [
    {"step": 1, "name": "MaterialHub product master", "status": "DONE", "why": "Ground floor. Products must exist before HUs can reference them."},
    {"step": 2, "name": "StockFlow Goods Receipt", "status": "BUILT-UNVERIFIED", "why": "First real transaction. Receive goods → create HU → post GR event."},
    {"step": 3, "name": "LedgerStock event ledger", "status": "NOT-STARTED", "why": "Make events visible. After GR works, show what was posted."},
    {"step": 4, "name": "StockFlow production ops", "status": "BUILT-UNVERIFIED", "why": "Move/split/consume HUs. Core client pain point."},
    {"step": 5, "name": "MaterialHub purchasing", "status": "NOT-STARTED", "why": "PO → GR link. Closes inbound supply chain."},
    {"step": 6, "name": "BuildOrder PP", "status": "NOT-STARTED", "why": "Production orders + BOM. Needs products and stock first."},
    {"step": 7, "name": "QualityGate QM", "status": "NOT-STARTED", "why": "Triggered by GR and production completion — both must exist first."},
    {"step": 8, "name": "DealFlow SD", "status": "NOT-STARTED", "why": "Selling needs products and stock. Builds on full MM/WM/IM."},
    {"step": 9, "name": "RouteRunner TM", "status": "NOT-STARTED", "why": "Shipments after delivery. Needs DealFlow to exist."},
]

@app.list_tools()
async def list_tools():
    return [
        Tool(name="get_vision",          description="ERPLite product vision and non-negotiable principles. Call at session start.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_current_status",  description="MOST IMPORTANT: what is verified working, what is broken, what is unverified, what is next. Read this before writing any code.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_session_context", description="Compact briefing for session start. Includes path, stack, current blockers, and what NOT to touch.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_tech_stack",      description="Full technology stack with non-negotiables including the compile gate rule.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_ui_spec",         description="UI colour themes, layout structure, component rules. Read before any frontend work.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_agents",          description="All 8 agents and their exact responsibilities.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_db_schema_rules", description="Database design rules including the compile gate. Read before any SQL or schema change.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_build_sequence",  description="Correct build order with status (DONE/BUILT-UNVERIFIED/NOT-STARTED) and architectural reason for each step.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_sap_concept",     description="SAP concept → ERPLite equivalent translation.", inputSchema={"type":"object","properties":{"concept":{"type":"string"}},"required":["concept"]}),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    def txt(s): return [TextContent(type="text", text=s)]

    if name == "get_vision":
        return txt(VISION)

    elif name == "get_current_status":
        return txt(json.dumps(CURRENT_STATUS, indent=2))

    elif name == "get_session_context":
        ctx = """ERPLite Session Context — Read Before Writing Code
======================================================
Path: /home/opengrace/erplite
Backend: Go 1.22 + Gin + sqlc + PostgreSQL 16 + Redis 7
Frontend: React 19 + TypeScript + Vite + Zustand
Infra: Docker Compose

PHASE: Phase 1 — Core Operations (in progress)

CURRENT BLOCKERS (fix these before anything else):
1. Org Structure screen blank — component not rendering, check routing in AppPage.tsx
2. Page refresh logs out user — JWT refresh on mount not implemented

UNVERIFIED (must recheck with curl before claiming done):
- GR posting: POST /api/gr → creates gr_document + handling_unit + inventory_event
- Production ops: POST /api/stock/move, /api/stock/split, /api/stock/consume
- Tenant config: GET /api/config/tenant, POST /api/config/domain-profiles/apply

NOT STARTED (do not touch until blockers are fixed):
- LedgerStock views
- MaterialHub purchasing

COMPILE GATE — NON-NEGOTIABLE:
After every Go file edit, run:
  docker run --rm -v /home/opengrace/erplite/backend:/app -w /app golang:1.22-bookworm go build ./... 2>&1
Must return zero output. If it returns errors, fix them before proceeding.
Air serves stale binary silently. This command cannot.

NON-NEGOTIABLES:
- inventory_events is append-only. No UPDATE or DELETE.
- HU identity never breaks. Split = child HU with parent_hu_id.
- Every API response uses public_id (UUID), never internal integer PK.
- No hardcoded data in UI. Every number from real DB query."""
        return txt(ctx)

    elif name == "get_tech_stack":
        return txt(json.dumps(TECH_STACK, indent=2))

    elif name == "get_ui_spec":
        return txt(json.dumps(UI_SPEC, indent=2))

    elif name == "get_agents":
        return txt(json.dumps(AGENTS, indent=2))

    elif name == "get_db_schema_rules":
        return txt(json.dumps(DB_SCHEMA_RULES, indent=2))

    elif name == "get_build_sequence":
        return txt(json.dumps(BUILD_SEQUENCE, indent=2))

    elif name == "get_sap_concept":
        concept = arguments.get("concept", "")
        data = SAP_CONCEPTS.get(concept)
        if not data:
            return txt(f"Concept '{concept}' not found. Available: {', '.join(SAP_CONCEPTS.keys())}")
        return txt(f"{concept}: {data}")

    return txt(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
