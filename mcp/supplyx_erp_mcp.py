#!/usr/bin/env python3
"""
SupplyX ERP MCP Server
==================
Serves as the persistent memory and project context for the SupplyX ERP build.
Instead of re-explaining the vision, stack, module structure, and SAP concepts
to the LLM every session, this server provides them as structured tools.

Install: pip install mcp
Run:     python erplite_mcp.py
Config:  Add to ~/.claude/claude_desktop_config.json (see README)
"""

import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("supplyxerp-context")

# ─── KNOWLEDGE BASE ──────────────────────────────────────────────────────────

VISION = """
SupplyX ERP Vision (Source of Truth — Do Not Override)
===================================================
SupplyX ERP is a production-grade, industry-agnostic ERP system for small and
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

MODULE_MAP = {
    "MaterialHub": {
        "sap_equivalent": "MM (Materials Management)",
        "supplyx_name": "MaterialHub",
        "ribbon_section": "MFG",
        "phase": 2,
        "status": "STABLE & VERIFIED: Org Structure, Goods Receipt, StockFlow (Scan/Move/Consume), UOM Engine, Tenant Config. Scorecard: 100%.",
        "description": "Material master, procurement, goods receipt, supplier management",
        "core_concepts": [
            "Material master record (product in SupplyX ERP)",
            "Purchasing organisation / purchasing group",
            "Purchase requisition → Purchase order → Goods receipt",
            "Supplier barcode mapping (SupplyX ERP differentiator)",
            "Flexible UOM: received in KG, sold in IMP, consumed in QTY",
            "Goods receipt posts to inventory_events (never overwrites stock)",
            "Vendor invoice verification",
            "Material valuation (standard price / moving average)",
        ],
        "sap_reference_book": "Materials Management with SAP S/4HANA (Akhtar & Murray)",
        "key_sap_objects": ["Material Master", "Vendor Master", "Purchase Order", "Inbound Delivery", "GR Document"],
        "build_order_priority": 1,
        "why_first": "MaterialHub is the ground floor. Products must exist before HUs can be created. Purchasing must exist before goods can be received. WM and IM operations are meaningless without material master data.",
        "supplyx_tables": ["products", "product_units", "batches", "purchase_orders", "purchase_order_lines", "price_versions", "barcodes"]
    },
    "StockFlow": {
        "sap_equivalent": "EWM (Extended Warehouse Management)",
        "supplyx_name": "StockFlow",
        "ribbon_section": "OPS",
        "phase": 1,
        "status": "STABLE & VERIFIED: HU Lifecycle, Lineage, Production Ops (Move, Split, Consume). Multi-mode Auth (JWT/Header).",
        "description": "Handling unit lifecycle, warehouse tasks, scan operations",
        "core_concepts": [
            "Handling Unit (HU) = primary physical entity",
            "HU has parent_hu_id for split/merge lineage — identity never breaks",
            "Warehouse Task = movement instruction (not direct update)",
            "Storage bins: RECV-01, STOR-01, STOR-02, PROD-01",
            "Inbound: Goods Receipt → HU creation → Putaway task",
            "Production: Scan → Consume → Split HU → Child HU created",
            "Relabeling = label_version increment, NOT new entity",
            "Duplicate scan prevention: Redis 5s idempotency window",
        ],
        "sap_reference_book": "Extended Warehouse Management with SAP S/4HANA (Patil, Ramireddi, Komatlapalli)",
        "key_sap_objects": ["Handling Unit", "Warehouse Task", "Transfer Order", "Storage Bin", "HU Split/Repack"],
        "build_order_priority": 2,
        "why_second": "StockFlow needs MaterialHub products to exist before HUs can reference them. The HU is the physical container of a material.",
        "supplyx_tables": ["handling_units", "locations", "warehouse_tasks", "barcodes", "inventory_events"]
    },
    "LedgerStock": {
        "sap_equivalent": "IM (Inventory Management)",
        "supplyx_name": "LedgerStock",
        "ribbon_section": "OPS",
        "phase": 1,
        "status": "ACTIVE_BUILD",
        "description": "Event-ledger stock model, goods movements, stock visibility",
        "core_concepts": [
            "Stock is a LEDGER — never a mutable balance column",
            "Every stock change = append to inventory_events",
            "Event types: GR / PUTAWAY / MOVE / CONSUME / SPLIT / MERGE / RELABEL / ADJUST",
            "Stock balance = SUM of events (computed view, never stored)",
            "Goods movement document = the SAP equivalent",
            "Physical inventory: count → adjust (ADJUST event)",
            "Stock categories: unrestricted, quality inspection, blocked, in-transit",
        ],
        "sap_reference_book": "Inventory Management with SAP S/4HANA 2nd Ed (Roedel)",
        "key_sap_objects": ["Material Document", "Goods Movement", "Stock Type", "Physical Inventory Document"],
        "build_order_priority": 3,
        "supplyx_tables": ["inventory_events", "handling_units", "locations"]
    },
    "BuildOrder": {
        "sap_equivalent": "PP (Production Planning)",
        "supplyx_name": "BuildOrder",
        "ribbon_section": "MFG",
        "phase": 2,
        "status": "SCHEMA_READY",
        "description": "Production orders, BOM, work centres, consumption tracking",
        "core_concepts": [
            "Bill of Materials (BOM) = list of components for a finished product",
            "Production order = instruction to produce a quantity",
            "Goods issue to production = CONSUME events against HUs",
            "Partial consumption (SupplyX ERP core strength) = HU split",
            "Backflushing = automatic GI on order confirmation",
            "Variance = planned qty vs actual qty consumed",
        ],
        "build_order_priority": 4,
        "supplyx_tables": ["production_orders", "bom_lines", "handling_units", "inventory_events"]
    },
    "QualityGate": {
        "sap_equivalent": "QM (Quality Management)",
        "supplyx_name": "QualityGate",
        "ribbon_section": "MFG",
        "phase": 2,
        "status": "SCHEMA_READY",
        "description": "Inspection lots, results recording, usage decisions",
        "core_concepts": [
            "Inspection lot triggered automatically by events (GR, production completion, HU split below threshold)",
            "Inspection plan = characteristics + tolerances per material",
            "Results stored in JSONB (flexible, no schema migration needed)",
            "Usage decision: PASS → stock to unrestricted; FAIL → blocked stock",
        ],
        "build_order_priority": 5,
        "supplyx_tables": ["inspection_lots"]
    },
    "DealFlow": {
        "sap_equivalent": "SD (Sales and Distribution)",
        "supplyx_name": "DealFlow",
        "ribbon_section": "COM",
        "phase": 3,
        "status": "SCHEMA_READY",
        "description": "Customer orders, pricing, delivery, billing",
        "core_concepts": [
            "Rule-table pricing engine (replaces SAP condition technique)",
            "Sales order → Delivery → Goods issue → Invoice",
            "Price history: every price has valid_from / valid_to",
            "Historical price accuracy: can reconstruct price on any past date",
        ],
        "build_order_priority": 6,
        "supplyx_tables": ["sales_orders", "sales_order_lines", "price_versions"]
    },
    "RouteRunner": {
        "sap_equivalent": "TM (Transportation Management)",
        "supplyx_name": "RouteRunner",
        "ribbon_section": "COM",
        "phase": 3,
        "status": "SCHEMA_READY",
        "description": "Shipments, carrier integration, route optimisation",
        "core_concepts": [
            "Carrier abstraction layer (any logistics provider plugs in)",
            "EDI X12 / EDIFACT support via carrier interface",
            "Shipment = container of delivery items",
            "Route optimisation via OSRM/Valhalla (open source)",
        ],
        "build_order_priority": 7,
        "supplyx_tables": ["shipments"]
    }
}

TECH_STACK = {
    "backend": {
        "language": "Go 1.21+",
        "framework": "Gin",
        "db_queries": "sqlc (type-safe, no ORM)",
        "database": "PostgreSQL 16",
        "cache": "Redis 7",
        "websocket": "gorilla/websocket",
        "hot_reload": "Air (cosmtrek/air)",
        "auth": "JWT RS256, 15min access + 7day refresh in HTTP-only cookie",
        "security": "RBAC middleware, prepared statements only, RLS in DB",
        "logging": "log/slog (stdlib, structured)",
    },
    "frontend": {
        "framework": "React 19 + TypeScript (strict mode)",
        "bundler": "Vite 5",
        "state": "Zustand (client state)",
        "server_state": "TanStack Query v5",
        "styling": "CSS custom properties only — no Tailwind, no styled-components",
        "components": "Hand-written — no UI library",
        "websocket": "Native browser WebSocket with auto-reconnect",
    },
    "infrastructure": {
        "dev": "Docker Compose",
        "analytics": "ClickHouse (Phase 2)",
        "messaging": "NATS JetStream (Phase 3)",
        "orchestration": "Kubernetes (Phase 3)",
        "observability": "OpenTelemetry + Grafana stack (Phase 3)",
        "secrets": "HashiCorp Vault (Phase 3)",
    },
    "non_negotiables": [
        "No raw SQL string concatenation — sqlc only",
        "No direct stock balance updates — events only",
        "No HU identity breaks — split creates child with parent_hu_id",
        "No microservices — one Go binary",
        "No V1/V2/V3 phasing within codebase — correct model from day one",
        "No placeholder functions returning hardcoded data",
        "No hidden agents — every step broadcasts via WebSocket",
        "TypeScript strict mode — no 'any' types",
        "Security by default — no CORS wildcard in production",
    ]
}

UI_SPEC = {
    "theme_system": {
        "OPS":  {"dark": "#0d3320", "accent": "#22c55e", "light": "rgba(22,163,74,0.06)",  "label": "Operations"},
        "MFG":  {"dark": "#2d1a00", "accent": "#f59e0b", "light": "rgba(245,158,11,0.06)", "label": "Manufacturing"},
        "COM":  {"dark": "#0a1a40", "accent": "#60a5fa", "light": "rgba(96,165,250,0.06)", "label": "Commerce"},
        "SYS":  {"dark": "#1a1640", "accent": "#a78bfa", "light": "rgba(167,139,250,0.06)","label": "System"},
        "CFG":  {"dark": "#2a0f20", "accent": "#f472b6", "light": "rgba(244,114,182,0.06)","label": "Config"},
    },
    "layout": "top-bar(46px) + sidebar(210px) + working-area(flex:1)",
    "shell_bg": "#111",
    "top_bar_bg": "#111",
    "working_area_bg": "#111 (never changes)",
    "sidebar_bg": "section dark colour (changes with ribbon tab)",
    "ribbon": "OPERATIONS | MFG | COMMERCE | SYSTEM | CONFIG — inside top bar",
    "trace": "Inline below scanner — NOT a separate right panel",
    "spec_file": "/mnt/user-data/outputs/erplite_ui_spec_v1.md",
    "design_rule": "Dark ribbon tab + dark sidebar = same colour. Light working area tint = same colour washed out.",
}

AGENTS = {
    "BarcodeAgent":        "Decode → resolve barcode to entity (HU/Product/Location) → validate not duplicate",
    "ErrorPreventionAgent":"Duplicate scan check (Redis 5s TTL), invalid state transitions, constraint enforcement",
    "InventoryAgent":      "HU lifecycle: create, fetch, split, merge, close. Updates quantity via events only.",
    "WarehouseAgent":      "Task creation and confirmation: putaway, move, pick. Never moves stock directly.",
    "ProductionAgent":     "Consumption: full and partial. Calls InventoryAgent.Split internally.",
    "LabelingAgent":       "Label generation with version increment. NEVER creates new HU identity.",
    "PricingAgent":        "Effective-date pricing lookup. Returns price valid on the requested date.",
    "AuditAgent":          "Append-only audit log. Records before+after state for every mutation.",
}

BUILD_SEQUENCE = [
    {
        "step": 1,
        "module": "MaterialHub (MM foundation)",
        "why": "Ground floor. Products/materials must exist before HUs, stock, or orders can reference them.",
        "deliverable": "Product master CRUD, UOM engine, supplier master, barcode registration. No purchasing yet.",
        "sap_chapter": "Ch 3-5: Material Master, Purchasing Master Data (MM book)",
    },
    {
        "step": 2,
        "module": "StockFlow core — Goods Receipt only",
        "why": "First floor. With products existing, you can receive goods, create HUs, and put them away.",
        "deliverable": "GR flow: scan → create HU → putaway task → location assignment → inventory_events entry",
        "sap_chapter": "Ch 4: Inbound Processing (EWM book)",
    },
    {
        "step": 3,
        "module": "LedgerStock — Event ledger visible",
        "why": "You now have events from GR. Build the ledger view immediately so the developer can SEE the data.",
        "deliverable": "Events table, stock snapshot view, summary bar. Real-time updates via WebSocket.",
        "sap_chapter": "Ch 1-3: Goods Movements, Stock Types (IM book)",
    },
    {
        "step": 4,
        "module": "StockFlow — Production operations (Consume, Split, Move)",
        "why": "The client's core pain. Partial consumption, HU splits, re-labelling. Now that GR works, production can consume.",
        "deliverable": "Consume/Split/Move operations. HU lineage tree. All 8 agents visible.",
        "sap_chapter": "Ch 6: Production Integration (EWM book)",
    },
    {
        "step": 5,
        "module": "MaterialHub — Purchasing (PO, GR link)",
        "why": "Procurement flow. PO → GR → stock. Completes the procurement-to-stock cycle.",
        "deliverable": "Purchase orders, PO line receiving, GR reference to PO.",
        "sap_chapter": "Ch 9-10: Purchase Requisitions, Purchase Orders (MM book)",
    },
    {
        "step": 6,
        "module": "BuildOrder (PP) — Work orders + BOM",
        "why": "Production orders need products (from MM) and stock (from IM/WM) to exist first.",
        "deliverable": "Production orders, BOM lines, planned vs actual consumption.",
    },
    {
        "step": 7,
        "module": "QualityGate (QM) — Inspection lots",
        "why": "Quality inspection is triggered by GR and production completion — both now exist.",
        "deliverable": "Auto-triggered inspection lots, results recording, usage decision (pass/fail → stock type change).",
    },
    {
        "step": 8,
        "module": "DealFlow (SD) — Sales orders",
        "why": "Selling requires products and stock to exist. Builds on the full MM/WM/IM foundation.",
        "deliverable": "Customer master, sales orders, delivery, goods issue (CONSUME event).",
    },
    {
        "step": 9,
        "module": "RouteRunner (TM) — Shipments",
        "why": "Transportation happens after delivery. Needs DealFlow to exist.",
        "deliverable": "Shipments, carrier assignment, tracking, EDI placeholders.",
    },
]

SAP_CORE_CONCEPTS = {
    "Handling_Unit": "The physical container of goods. Has quantity, unit, location, status. Can be split (parent→children) or merged. Identity never changes — only label_version increments.",
    "Material_Document": "The record of a goods movement in SAP. In SupplyX ERP = an entry in inventory_events.",
    "Movement_Type": "SAP code defining what kind of stock change occurred (101=GR from PO, 261=GI to production, 311=transfer). In SupplyX ERP = event_type field.",
    "Plant": "SAP's manufacturing/storage unit. In SupplyX ERP = Site (physical location). One default Site is auto-provisioned per tenant. Sites belong to an Organisation (Company Code equivalent). See get_org_model.",
    "Storage_Location": "SAP's storage granularity within a Plant. In SupplyX ERP = Zone. Zone has a zone_type (RECEIVING/STORAGE/PRODUCTION/DISPATCH/QC) which drives workflow behaviour automatically — replacing SAP movement type configuration.",
    "Warehouse_Task": "SAP's instruction to move goods from source to destination. In SupplyX ERP = warehouse_tasks table. Never moves stock directly.",
    "MRP": "Material Requirements Planning. Calculates what needs to be purchased/produced based on demand. Phase 2 feature of BuildOrder.",
    "Valuation": "The monetary value of stock. In SupplyX ERP = price_versions table with valid_from/valid_to for historical accuracy.",
    "Batch": "A lot of material with shared characteristics (expiry, origin). Optional in SupplyX ERP but schema-ready.",
    "Purchasing_Organisation": "SAP's buying entity. In SupplyX ERP = tenant-level config for Phase 2. Purchasing authority is inherited from Organisation.",
}

# ─── TOOL HANDLERS ───────────────────────────────────────────────────────────

@app.list_tools()
async def list_tools():
    return [
        Tool(name="get_vision",           description="Returns the SupplyX ERP product vision, philosophy, and non-negotiable principles. Call this at the start of every session.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_module",           description="Returns full spec for a specific SupplyX ERP module: purpose, SAP equivalent, build priority, core concepts, and related tables. Pass module name.", inputSchema={"type":"object","properties":{"module":{"type":"string","description":"Module name: MaterialHub, StockFlow, LedgerStock, BuildOrder, QualityGate, DealFlow, RouteRunner"}},"required":["module"]}),
        Tool(name="get_all_modules",      description="Returns the complete module map with build priorities and phases. Use to understand the full system scope.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_tech_stack",       description="Returns the full technology stack decision with rationale and non-negotiable constraints.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_ui_spec",          description="Returns the UI design specification: colour themes, layout structure, component rules. Always consult before writing any frontend code.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_agents",           description="Returns all 8 domain agents with their exact responsibilities. Every operation must route through these agents.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_build_sequence",   description="Returns the correct build order for all modules with the architectural reason WHY each step comes before the next. This is the answer to 'where do we start?'", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_sap_concept",      description="Returns the SupplyX ERP equivalent of a SAP concept. Use when translating SAP terminology to SupplyX ERP implementation.", inputSchema={"type":"object","properties":{"concept":{"type":"string","description":"SAP concept name e.g. Handling_Unit, Material_Document, Movement_Type, Storage_Bin"}},"required":["concept"]}),
        Tool(name="get_all_sap_concepts", description="Returns all SAP→SupplyX ERP concept translations. Use at session start when working on domain logic.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_org_model",        description="Returns the canonical SupplyX ERP organisational hierarchy model. Call this before writing any schema, API, or UI that references tenant, site, zone, or location. Replaces the old flat locations model.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_current_status",   description="Returns what is built, what is in progress, and what is next. The live project status.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_session_context",  description="Returns a compact context block suitable for injecting at the start of any Claude Code or Codex session. Saves tokens by providing structured context instead of prose re-explanation.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_db_schema_rules",  description="Returns the database design rules and critical constraints. Consult before writing any SQL or schema change.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_migration_model", description="Returns the zero-friction migration model, domain profiles, and sequence safety rules.", inputSchema={"type":"object","properties":{}}),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    def txt(content): return [TextContent(type="text", text=content)]

    if name == "get_vision":
        return txt(VISION)

    elif name == "get_module":
        mod = arguments.get("module", "")
        data = MODULE_MAP.get(mod)
        if not data:
            available = ", ".join(MODULE_MAP.keys())
            return txt(f"Module '{mod}' not found. Available: {available}")
        return txt(json.dumps(data, indent=2))

    elif name == "get_all_modules":
        summary = {k: {"phase": v["phase"], "status": v["status"], "sap_eq": v["sap_equivalent"],
                        "priority": v["build_order_priority"], "ribbon": v["ribbon_section"]}
                   for k, v in MODULE_MAP.items()}
        return txt(json.dumps(summary, indent=2))

    elif name == "get_tech_stack":
        return txt(json.dumps(TECH_STACK, indent=2))

    elif name == "get_ui_spec":
        return txt(json.dumps(UI_SPEC, indent=2))

    elif name == "get_agents":
        return txt(json.dumps(AGENTS, indent=2))

    elif name == "get_build_sequence":
        return txt(json.dumps(BUILD_SEQUENCE, indent=2))

    elif name == "get_sap_concept":
        concept = arguments.get("concept", "")
        data = SAP_CORE_CONCEPTS.get(concept)
        if not data:
            return txt(f"Concept '{concept}' not found. Available: {', '.join(SAP_CORE_CONCEPTS.keys())}")
        return txt(f"{concept}: {data}")

    elif name == "get_all_sap_concepts":
        return txt(json.dumps(SAP_CORE_CONCEPTS, indent=2))

    elif name == "get_org_model":
        org_model = {
            "model": "Flexible Depth Hierarchy",
            "rationale": "SAP's 4-level rigidity forces dummy nodes for SMEs. SupplyX ERP depth is optional — the system adapts to the business.",
            "hierarchy": {
                "level_1": {"erplite": "Tenant", "sap_equivalent": "Client", "notes": "Top-level SaaS isolation. One per customer account."},
                "level_2": {"erplite": "Organisation", "sap_equivalent": "Company Code", "notes": "Legal and financial boundary. Holds currency, fiscal year. Required."},
                "level_3": {"erplite": "Site", "sap_equivalent": "Plant", "notes": "Physical location. Optional for single-site SMEs — a default site is auto-provisioned."},
                "level_4": {"erplite": "Zone", "sap_equivalent": "Storage Location", "notes": "Operational area within a site. Always required for physical operations."},
                "level_5": {"erplite": "Bin", "sap_equivalent": "Storage Bin (EWM)", "notes": "Precise physical position within a zone. Optional. Phase 2."}
            },
            "auto_provisioning": "On new tenant creation, the system automatically creates: 1 Organisation, 1 default Site, and 4 default Zones (RECEIVING, STORAGE, PRODUCTION, DISPATCH). Operator can scan on day one with zero configuration.",
            "zone_types": {
                "RECEIVING": "Triggers inbound inspection workflow on goods arrival.",
                "STORAGE": "Standard unrestricted stock zone.",
                "PRODUCTION": "Consumption and split operations permitted.",
                "DISPATCH": "Triggers outbound verification workflow.",
                "QC": "Blocks goods issue until quality decision is recorded."
            },
            "cross_site_rule": "A manager at Site A can view stock at Site B in read-only mode. Transfers between sites are a formal documented event (SITE_TRANSFER inventory_event type).",
            "migration_note": "The existing 'locations' table maps to 'zones'. Sites and organisations tables are additive — migration is non-destructive.",
            "operational_tables_rule": "Every operational table (handling_units, inventory_events, warehouse_tasks) carries BOTH site_id and zone_id. site_id may reference the auto-provisioned default site for single-site tenants.",
            "schema": {
                "organisations": "id, tenant_id, public_id, name, legal_name, currency CHAR(3), fiscal_year_start INT, is_active",
                "sites": "id, tenant_id, organisation_id, public_id, code, name, address JSONB, timezone, is_active | UNIQUE(tenant_id, code)",
                "zones": "id, tenant_id, site_id, public_id, code, name, zone_type, is_active | UNIQUE(site_id, code)"
            }
        }
        return txt(json.dumps(org_model, indent=2))

    elif name == "get_current_status":
        status = {
            "phase_1": "COMPLETE & VERIFIED (Scorecard available)",
            "built": [
                "DB schema (all tables + repaired sequences)",
                "JWT auth (Dual Cookie/Bearer Support)",
                "WebSocket hub (connected)",
                "8 agent interfaces",
                "StockFlow scan/move/consume API (VERIFIED)",
                "Frontend shell with ribbon nav and colour themes",
                "MaterialHub product master CRUD",
                "Org hierarchy (Tenant → Org → Site → Zone) - VERIFIED",
                "StockFlow GR flow (goods receipt) - VERIFIED",
                "Tenant config (Profiles, Sequences, Migration) - VERIFIED",
                "LedgerStock — pure computed stock aggregation (VERIFIED)",
            ],
            "in_progress": [
                "MaterialHub — Purchasing (PO → GR integration)",
            ],
            "next": "Phase 2: MaterialHub Purchasing Integration. Procurement life-cycle.",
        }
        return txt(json.dumps(status, indent=2))

    elif name == "get_session_context":
        ctx = """SupplyX ERP Project Context (MCP — do not re-explain, act on this)
================================================================
Vision: Production ERP for SMEs. SAP-equivalent quality. 10-year horizon.
Stack: Go/Gin + PostgreSQL + Redis + React/Vite + Docker Compose.
Path: /home/opengrace/erplite
UI Spec: /mnt/user-data/outputs/erplite_ui_spec_v1.md (FROZEN — code conforms to this)

ORG MODEL: Flexible Depth Hierarchy (NOT SAP's rigid 4-level).
  Tenant → Organisation → Site (optional) → Zone → Bin (optional)
  Call get_org_model for the canonical spec before touching any location/zone/site code.

CORRECT BUILD ORDER (follow this — do not skip steps):
1. ✅ MaterialHub product master
2. ✅ Org hierarchy migration — organisations + sites + zones
3. ✅ StockFlow GR + HU creation
4. ✅ Tenant Configurability & Data Migration (Setup Cockpit)
5. ✅ LedgerStock stock aggregation (PURE COMPUTED VIEW)
6. ✅ StockFlow production ops (consume/split/move)
7. MaterialHub purchasing (PO → GR — NEXT STEP)
8. BuildOrder, QualityGate, DealFlow, RouteRunner

NON-NEGOTIABLES:
- Stock is a ledger (inventory_events). Never overwrite balances.
- HU identity never breaks. Split = child HU with parent_hu_id.
- All 8 agents must broadcast every step via WebSocket.
- Frontend and backend built simultaneously. If it's not visible, it doesn't exist.
- No V1/V2. No placeholder functions. No hardcoded mock data.
- Every operational table carries BOTH site_id and zone_id.
- Auto-provision org/site/zones on tenant creation — zero-config day one.
- Opening balance = OPENING_BALANCE ledger event.

CURRENT STEP: Phase 2 Kickoff. MaterialHub Purchasing Integration: PO → GR link."""
        return txt(ctx)

    elif name == "get_db_schema_rules":
        rules = {
            "pk_rule": "Use BIGINT GENERATED ALWAYS AS IDENTITY for all PKs. Never use SERIAL. Never use UUID as PK.",
            "public_id_rule": "Every table gets a UUID public_id column (DEFAULT gen_random_uuid()) for external API exposure. Internal code uses integer PK. API responses use public_id only.",
            "tenant_rule": "Every table gets tenant_id BIGINT REFERENCES tenants(id). Row-level security enforced at DB level.",
            "stock_rule": "NEVER add a stock balance column. Stock = SUM of inventory_events grouped by hu_id. Create a PostgreSQL VIEW for snapshot queries.",
            "hu_identity_rule": "handling_units.id never changes. Split: parent keeps ID, child gets new ID with parent_hu_id = parent.id. label_version increments on relabel.",
            "event_rule": "inventory_events is append-only. No UPDATE or DELETE. Partition by created_at (monthly).",
            "fk_rule": "All foreign keys must have explicit ON DELETE rule. Document the choice with a SQL comment.",
            "nullable_rule": "No nullable columns without a SQL comment explaining why nullable is necessary.",
            "index_rule": "Index: tenant_id on every table. Index: hu_id + created_at on inventory_events. Index: code + tenant_id on barcodes (UNIQUE).",
            "migration_rule": "Schema is complete from 001_init.sql. No 002_add_column migrations needed — all tables are defined upfront including Phase 2/3 tables.",
        }
        return txt(json.dumps(rules, indent=2))

    elif name == "get_migration_model":
        model = {
            "philosophy": "Zero-friction SME onboarding. Legacy data enters through formal ledger events.",
            "profiles": ["GENERAL", "MANUFACTURING", "DISTRIBUTION", "RETAIL", "PHARMA", "TEXTILE", "CONSTRUCTION", "FOOD"],
            "sequence_rules": {
                "forward_only": "Sequences can only be re-seeded to a value HIGHER than the current max document number.",
                "format_tags": ["{YEAR}", "{SEQ}"],
                "safety": "Checked documents: GR (gr_documents), PO (purchase_orders), HU (barcodes/handling_units)"
            },
            "reset_logic": {
                "admin_only": "Requires role_id 1 and typed confirmation 'RESET TENANT'.",
                "destructive": "Clears operational data (GRs, HUs, Tasks, Events) but preserves master data (Tenants, Users, Products, Zones).",
                "snapshot": "Generates a summary JSON before deletion."
            }
        }
        return txt(json.dumps(model, indent=2))

    return txt(f"Unknown tool: {name}")

# ─── ENTRY POINT ─────────────────────────────────────────────────────────────

async def main():
    async with stdio_server() as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
