#!/usr/bin/env python3
"""
ERPLite MCP Server — Restored & Updated April 2026
==================================================
Project memory for the ERPLite (SupplyX ERP) build.
Provides 14 structured tools for domain context and build tracking.

IMPORTANT: This is the Source of Truth. Update get_current_status regularly.
"""

import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

app = Server("erplite-context")

# ─── KNOWLEDGE BASE ──────────────────────────────────────────────────────────

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

MODULE_MAP = {
    "MaterialHub": {
        "sap_equivalent": "MM (Materials Management)",
        "supplyx_name": "MaterialHub",
        "ribbon_section": "MFG",
        "phase": 2,
        "status": "BUILT & SMOKE TESTED: Product master, Supplier management, Info records, UOM engine.",
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
        "why_first": "MaterialHub is the ground floor.",
        "supplyx_tables": ["products", "product_units", "batches", "purchase_orders", "purchase_order_lines", "price_versions", "barcodes"]
    },
    "StockFlow": {
        "sap_equivalent": "EWM (Extended Warehouse Management)",
        "supplyx_name": "StockFlow",
        "ribbon_section": "OPS",
        "phase": 1,
        "status": "BUILT & SMOKE TESTED: Scan/Move/Consume verified. HU Lifecycle active.",
        "description": "Handling unit lifecycle, warehouse tasks, scan operations",
        "core_concepts": [
            "Handling Unit (HU) = primary physical entity",
            "HU has parent_hu_id for split/merge lineage",
            "Warehouse Task = movement instruction",
            "Storage bins: RECV-01, STOR-01, STOR-02, PROD-01",
        ],
        "sap_reference_book": "Extended Warehouse Management with SAP S/4HANA (Patil, Ramireddi, Komatlapalli)",
        "key_sap_objects": ["Handling Unit", "Warehouse Task", "Transfer Order", "Storage Bin"],
        "build_order_priority": 2,
        "supplyx_tables": ["handling_units", "locations", "warehouse_tasks", "barcodes", "inventory_events"]
    },
    "LedgerStock": {
        "sap_equivalent": "IM (Inventory Management)",
        "supplyx_name": "LedgerStock",
        "ribbon_section": "OPS",
        "phase": 1,
        "status": "BUILT & SMOKE TESTED: Stock overview, movements, adjustments functional.",
        "description": "Event-ledger stock model, goods movements, stock visibility",
        "core_concepts": [
            "Stock is a LEDGER — never a mutable balance column",
            "Every stock change = append to inventory_events",
            "Event types: GR / PUTAWAY / MOVE / CONSUME / SPLIT / MERGE / RELABEL / ADJUST",
        ],
        "sap_reference_book": "Inventory Management with SAP S/4HANA 2nd Ed (Roedel)",
        "key_sap_objects": ["Material Document", "Goods Movement", "Stock Type"],
        "build_order_priority": 3,
        "supplyx_tables": ["inventory_events", "handling_units", "locations"]
    },
    "RFQManagement": {
        "sap_equivalent": "Sourcing",
        "supplyx_name": "RFQManagement",
        "ribbon_section": "MFG",
        "phase": 3,
        "status": "BUILT & SMOKE TESTED: Quotations, Comparison, Selection lifecycle functional.",
        "description": "Request for Quotation management",
        "core_concepts": ["RFQ → Vendor Invite → Quotation Entry → Comparison → Award"],
        "build_order_priority": 4,
        "supplyx_tables": ["rfq_documents", "rfq_lines", "rfq_quotations"]
    },
    "POManagement": {
        "sap_equivalent": "Purchasing",
        "supplyx_name": "POManagement",
        "ribbon_section": "MFG",
        "phase": 3,
        "status": "BUILT & SMOKE TESTED: PO Creation, Approval, Progress tracking functional.",
        "description": "Purchase Order lifecycle",
        "core_concepts": ["PR → PO → Approval → Output → Receipt"],
        "build_order_priority": 5,
        "supplyx_tables": ["purchase_orders", "purchase_order_lines"]
    },
    "BuildOrder": {
        "sap_equivalent": "PP (Production Planning)",
        "supplyx_name": "BuildOrder",
        "ribbon_section": "MFG",
        "phase": 2,
        "status": "BUILT & SMOKE TESTED: BO creation, release, and output confirmation functional.",
        "description": "Production orders, BOM, work centres",
        "core_concepts": ["BOM → Production Order → Material Issue → Confirmation"],
        "build_order_priority": 6,
        "supplyx_tables": ["build_orders", "build_order_outputs"]
    },
    "QualityGate": {
        "sap_equivalent": "QM (Quality Management)",
        "supplyx_name": "QualityGate",
        "ribbon_section": "MFG",
        "phase": 2,
        "status": "BUILT & SMOKE TESTED: Inspection lots, Results recording functional.",
        "description": "Quality checks and inspections",
        "core_concepts": ["Inspection Lot → Result Recording → Usage Decision"],
        "build_order_priority": 7,
        "supplyx_tables": ["quality_checks", "quality_check_findings"]
    },
    "DealFlow": {
        "sap_equivalent": "SD (Sales)",
        "supplyx_name": "DealFlow",
        "ribbon_section": "COM",
        "phase": 3,
        "status": "BUILT & SMOKE TESTED: Customers and Deals (Sales Orders) functional.",
        "description": "Sales management",
        "core_concepts": ["Customer → Deal → Order → Shipment"],
        "build_order_priority": 8,
        "supplyx_tables": ["deals", "deal_lines", "customers"]
    },
    "RouteRunner": {
        "sap_equivalent": "TM (Transportation)",
        "supplyx_name": "RouteRunner",
        "ribbon_section": "COM",
        "phase": 3,
        "status": "BUILT & SMOKE TESTED: Shipments, Packing, Dispatch functional.",
        "description": "Shipment and logistics management",
        "core_concepts": ["Shipment → Pack → Dispatch → Confirm Delivery"],
        "build_order_priority": 9,
        "supplyx_tables": ["shipments", "shipment_lines"]
    }
}

UI_SPEC = {
    "version": "1.0 — FROZEN",
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
        "path": "/home/opengrace/supplyxerp/backend",
    },
    "frontend": {
        "framework": "React 18.3.1 + TypeScript (strict mode)",
        "bundler": "Vite 5",
        "state": "Zustand",
        "server_state": "TanStack Query v5",
        "styling": "CSS custom properties only",
        "path": "/home/opengrace/supplyxerp/frontend",
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
    "compile_gate": "After every file edit: docker run --rm -v /home/opengrace/supplyxerp/backend:/app -w /app golang:1.22-bookworm go build ./... — must return zero output before continuing.",
}

SAP_CORE_CONCEPTS = {
    "Handling_Unit": "Physical container of goods. Has quantity, unit, location, status. Can be split (parent→children) or merged. Identity never changes — only label_version increments on relabel.",
    "Material_Document": "Record of a goods movement. In ERPLite = entry in inventory_events.",
    "Movement_Type": "SAP code for kind of stock change (101=GR, 261=GI to production, 311=transfer). In ERPLite = event_type field.",
    "Storage_Bin": "Physical location within warehouse. In ERPLite = zones table (zone_type: RECEIVING/STORAGE/PRODUCTION/DISPATCH).",
    "Warehouse_Task": "Instruction to move goods from source to destination. In ERPLite = warehouse_tasks table. Never moves stock directly.",
    "Goods_Receipt": "Formal posting of inbound goods. In ERPLite = gr_documents table + GR event in inventory_events + HU creation.",
    "MRP": "Material Requirements Planning. Phase 2 — BuildOrder module.",
    "Valuation": "Monetary value of stock. In ERPLite = price_versions table with valid_from/valid_to for historical accuracy.",
    "Batch": "Lot of material with shared characteristics. Optional in ERPLite, schema-ready.",
    "Plant": "SAP manufacturing/storage unit. In ERPLite = sites table within org hierarchy.",
    "Purchasing_Organisation": "SAP buying entity. In ERPLite = tenant-level config, Phase 2.",
}

ORG_MODEL = {
    "model": "Flexible Depth Hierarchy",
    "rationale": "SAP's 4-level rigidity forces dummy nodes for SMEs. SupplyX ERP depth is optional — the system adapts to the business.",
    "hierarchy": {
        "level_1": {"erplite": "Tenant", "sap_equivalent": "Client", "notes": "Top-level SaaS isolation. One per customer account."},
        "level_2": {"erplite": "Organisation", "sap_equivalent": "Company Code", "notes": "Legal and financial boundary. Holds currency, fiscal year. Required."},
        "level_3": {"erplite": "Site", "sap_equivalent": "Plant", "notes": "Physical location. Optional for single-site SMEs — a default site is auto-provisioned."},
        "level_4": {"erplite": "Zone", "sap_equivalent": "Storage Location", "notes": "Operational area within a site. Always required for physical operations."},
        "level_5": {"erplite": "Bin", "sap_equivalent": "Storage Bin (EWM)", "notes": "Precise physical position within a zone. Optional. Phase 2."}
    },
    "auto_provisioning": "On new tenant creation, the system automatically creates: 1 Organisation, 1 default Site, and 4 default Zones (RECEIVING, STORAGE, PRODUCTION, DISPATCH).",
    "zone_types": {
        "RECEIVING": "Triggers inbound inspection workflow on goods arrival.",
        "STORAGE": "Standard unrestricted stock zone.",
        "PRODUCTION": "Consumption and split operations permitted.",
        "DISPATCH": "Triggers outbound verification workflow.",
        "QC": "Blocks goods issue until quality decision is recorded."
    },
    "cross_site_rule": "A manager at Site A can view stock at Site B in read-only mode.",
    "operational_tables_rule": "Every operational table carries BOTH site_id and zone_id.",
}

MIGRATION_MODEL = {
    "philosophy": "Zero-friction SME onboarding. Legacy data enters through formal ledger events.",
    "profiles": ["GENERAL", "MANUFACTURING", "DISTRIBUTION", "RETAIL", "PHARMA", "TEXTILE", "CONSTRUCTION", "FOOD"],
    "sequence_rules": {
        "forward_only": "Sequences can only be re-seeded to a value HIGHER than the current max.",
        "format_tags": ["{YEAR}", "{SEQ}"],
        "safety": "Checked documents: GR, PO, HU"
    }
}

CURRENT_STATUS = {
    "last_updated": "2026-04-25",
    "phase": "Phase 4 — Commerce & Integration",
    "backend": {
        "database_tables": [
            "access_sequence_steps", "access_sequences", "audit_log", "barcodes", "batches", "blocked_operations", "bom_lines", 
            "build_order_components", "build_order_issues", "build_order_outputs", "build_orders", "calculation_schema_steps", 
            "calculation_schemas", "calendar_exceptions", "companies", "condition_types", "customers", "deal_lines", "deals", 
            "delivery_confirmation_lines", "delivery_confirmations", "dispatch_rules", "document_dispatches", "execution_trace_steps", 
            "execution_traces", "gr_documents", "gr_lines", "handling_units", "inspection_lots", "inventory_events", 
            "inventory_events_2025", "inventory_events_2026", "locations", "opening_balance_imports", "operational_calendars", 
            "organisations", "po_account_assignments", "po_block_reasons", "po_delivery_schedule", "po_header_conditions", 
            "po_item_conditions", "po_item_confirmation", "po_item_delivery", "po_item_invoice", "po_item_progress", 
            "po_output_messages", "po_status_summary", "po_tracking_scenario_events", "po_tracking_scenarios", "price_formulas", 
            "price_rule_records", "price_rules", "price_versions", "pricing_condition_records", "pricing_condition_types", 
            "procurement_teams", "procurement_unit_sites", "procurement_units", "product_price_history", "production_orders", 
            "products", "purchase_order_lines", "purchase_orders", "purchase_request_lines", "purchase_requests", 
            "purchasing_info_records", "quality_check_findings", "quality_checks", "rfq_delivery_schedules", "rfq_document_types", 
            "rfq_documents", "rfq_lines", "rfq_order_reasons", "rfq_quotation_lines", "rfq_quotations", "rfq_quote_lines", 
            "rfq_quotes", "rfq_suppliers", "rfq_vendors", "roles", "sales_order_lines", "sales_orders", "shipment_lines", 
            "shipments", "sites", "stock_adjustments", "stock_reservations", "storage_areas", "supplier_invoice_lines", 
            "supplier_invoices", "suppliers", "supply_pact_lines", "supply_pact_releases", "supply_pact_schedule", "supply_pacts", 
            "system_logs", "tenant_config", "tenant_sequences", "tenants", "user_roles", "users", "v_hu_lineage", 
            "v_hu_movement_history", "v_product_stock_summary", "v_stock_on_hand", "v_zone_stock", "vendor_scorecards", 
            "warehouse_tasks", "warehouses", "zones"
        ],
        "registered_routes": {
            "Auth": ["/api/auth/login", "/api/auth/logout", "/api/auth/me"],
            "Org": ["/api/organisations", "/api/org-tree", "/api/org/summary", "/api/org/companies", "/api/org/sites", "/api/org/zones", "/api/org/calendars", "/api/org/procurement-units", "/api/org/procurement-teams"],
            "MaterialHub": ["/api/products", "/api/suppliers", "/api/barcodes", "/api/info-records"],
            "StockFlow": ["/api/scan", "/api/move", "/api/gr", "/api/warehouse-tasks"],
            "LedgerStock": ["/api/stock/overview", "/api/stock/products", "/api/stock/zones", "/api/stock/hu/:hu_code", "/api/stock/movements", "/api/stock/adjust"],
            "Purchasing": ["/api/purchase-requests", "/api/purchase-orders", "/api/po/scenarios", "/api/po/progress/dashboard"],
            "RFQ": ["/api/rfq", "/api/rfq/:id", "/api/rfq/:id/quotations", "/api/rfq/:id/compare"],
            "SupplyPacts": ["/api/supply-pacts", "/api/vendors/:id/scorecard", "/api/price-formulas", "/api/dispatch/rules"],
            "DealFlow": ["/api/deals", "/api/customers"],
            "RouteRunner": ["/api/shipments"],
            "System": ["/api/system/logs", "/api/users", "/api/tenants", "/api/config/tenant"]
        },
        "migrations_applied": ["001_init.sql", "002_materialhub.sql", "003_org_hierarchy.sql", "004_gr_document.sql", "005_tenant_config.sql", "006_opening_balance.sql", "007_stock_views.sql", "008_production_ops.sql", "009_purchasing_suite.sql", "010_document_completeness.sql", "011_pricing_and_rfq.sql", "012_rename_rfq_tables.sql", "013_rfq_complete.sql", "014_rfq_schema_fix.sql", "015_org_master.sql", "016_po_document_enrich.sql", "017_po_item_weights.sql", "017_system_logs.sql", "018_po_progress_tracking.sql", "019_supply_pacts.sql", "020_goods_receipt_invoice.sql", "021_build_quality.sql", "022_dealflow_routerunner.sql"],
    },
    "modules": {
        "MaterialHub": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "StockFlow": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "LedgerStock": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "RFQManagement": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "POManagement": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "BuildOrder": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "QualityGate": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "DealFlow": {
            "backend": "BUILT",
            "api_smoke": "200",
            "frontend": "LIVE",
            "verified": True,
            "completed_date": "2026-04-25",
            "endpoints_verified": [
                "GET  /api/com/customers → 200",
                "POST /api/com/customers → 201",
                "GET  /api/com/sales-orders → 200",
                "POST /api/com/sales-orders → 201 + auto-number SO-YYYY-NNNNN",
                "GET  /api/com/sales-orders/:id → 200 with lines",
                "POST /api/com/sales-orders/:id/confirm → 200",
                "POST /api/com/sales-orders/:id/cancel → 200",
                "GET  /api/com/deal-flow/dashboard → 200"
            ]
        },
        "RouteRunner": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "SupplyPacts": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "VendorScorecard": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "PriceFormulas": {
            "backend": "BUILT",
            "api_smoke": "200",
            "frontend": "LIVE",
            "verified": True,
            "completed_date": "2026-04-26"
        },
        "OrgStructure": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE (Reported Blank)", "verified": False},
        "SystemLog": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
        "UsersRoles": {"backend": "BUILT", "api_smoke": "200", "frontend": "LIVE", "verified": True},
    },
    "blockers": [
        "Org Structure screen blank (Backend returns 200, frontend possibly failing to render data)",
        "Session persistence logs user out on refresh (check useAppStore.ts checkSession)",
        "IMPORTANT: IDE history lost on 2026-04-25 due to system freeze. MCP is the only session memory. Always call get_session_context and get_current_status at the start of every session."
    ],
    "tech_stack_actual": {
        "backend": "Go 1.22 + Gin + sqlc + PostgreSQL 16 + Redis 7",
        "frontend": "React 18.3.1 + TypeScript 5.9.3 + Vite 5 + Zustand",
        "styling": "CSS custom properties + Tailwind 3",
        "components": "Hand-written + Radix UI primitives",
        "auth": "JWT RS256",
        "infra": "Docker Compose",
    },
    "next_build_sequence": [
        "1. Fix broken endpoints   → DONE",
        "2. DealFlow end to end    → DONE (2026-04-25)",
        "3. RouteRunner shipments  → NEXT",
        "4. Supply Pacts           → NOT_STARTED"
    ],
}

BUILD_SEQUENCE = [
    {"step": 1, "name": "Bug Fixes: Org Structure & Session", "status": "DONE", "reason": "Basic UI stability required before further feature work."},
    {"step": 2, "name": "DealFlow — Sales Orders end to end", "status": "DONE", "reason": "Money flow — clients judge by this first"},
    {"step": 3, "name": "RouteRunner — Shipments end to end", "status": "NEXT", "reason": "Closes purchase-to-dispatch loop"},
    {"step": 4, "name": "Supply Pacts — Real calculations", "status": "NOT_STARTED", "reason": "Pact UI exists but engine needs wiring"},
    {"step": 5, "name": "Build Order — Integration test", "status": "PARTIAL", "reason": "BO functional but end-to-end material flow needs verification"},
    {"step": 6, "name": "Quality Gate — Integration test", "status": "PARTIAL", "reason": "Inspection results -> Vendor score update needs verification"},
    {"step": 7, "name": "Price Formulas — Engine test", "status": "PARTIAL", "reason": "Calculation engine needs more complex scenario testing"},
    {"step": 8, "name": "Document Dispatch — SMTP", "status": "STUB", "reason": "Needs real email provider integration"},
    {"step": 9, "name": "Multi-tenant RLS", "status": "NOT_STARTED", "reason": "Critical for production security"},
    {"step": 10, "name": "Performance baseline", "status": "NOT_STARTED", "reason": "Final optimization pass"},
]

@app.list_tools()
async def list_tools():
    return [
        Tool(name="get_vision",           description="ERPLite product vision and philosophy. Call at session start.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_module",           description="Detailed spec for a specific module. Pass module name.", inputSchema={"type":"object","properties":{"module":{"type":"string"}},"required":["module"]}),
        Tool(name="get_all_modules",      description="Complete module map with build priorities.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_tech_stack",       description="Full technology stack with rationale.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_ui_spec",          description="UI colour themes, layout structure, component rules.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_agents",           description="All 8 domain agents and their exact responsibilities.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_build_sequence",   description="Correct build order with architectural reasons.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_sap_concept",      description="SAP concept → ERPLite equivalent translation.", inputSchema={"type":"object","properties":{"concept":{"type":"string"}},"required":["concept"]}),
        Tool(name="get_all_sap_concepts", description="Returns all SAP→SupplyX ERP concept translations.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_org_model",        description="Canonical organisational hierarchy model (Tenant→Org→Site→Zone).", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_current_status",   description="MOST IMPORTANT: what is verified working, what is broken, what is next.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_session_context",  description="Compact briefing for session start.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_db_schema_rules",  description="Database design rules and constraints.", inputSchema={"type":"object","properties":{}}),
        Tool(name="get_migration_model",  description="Zero-friction migration model and sequence rules.", inputSchema={"type":"object","properties":{}}),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    def txt(s): return [TextContent(type="text", text=s)]

    if name == "get_vision":
        return txt(VISION)

    elif name == "get_module":
        mod = arguments.get("module", "")
        data = MODULE_MAP.get(mod)
        if not data:
            return txt(f"Module '{mod}' not found. Available: {', '.join(MODULE_MAP.keys())}")
        return txt(json.dumps(data, indent=2))

    elif name == "get_all_modules":
        return txt(json.dumps(MODULE_MAP, indent=2))

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
            return txt(f"Concept '{concept}' not found.")
        return txt(f"{concept}: {data}")

    elif name == "get_all_sap_concepts":
        return txt(json.dumps(SAP_CORE_CONCEPTS, indent=2))

    elif name == "get_org_model":
        return txt(json.dumps(ORG_MODEL, indent=2))

    elif name == "get_current_status":
        return txt(json.dumps(CURRENT_STATUS, indent=2))

    elif name == "get_session_context":
        ctx = f"""SupplyXERP Session Context — {json.dumps(CURRENT_STATUS['last_updated'])}
=====================================
Project: /home/opengrace/supplyxerp
Backend:  Go 1.22 + Gin + sqlc + PostgreSQL 16 + Redis 7
Frontend: React 18.3.1 + TypeScript 5.9.3 + Vite 5 + Zustand + Tailwind 3
Auth:     JWT RS256 — access token in header, refresh in HTTP-only cookie
Infra:    Docker Compose

COMPILE GATE — NON-NEGOTIABLE AFTER EVERY GO FILE EDIT:
  docker run --rm -v /home/opengrace/supplyxerp/backend:/app -w /app golang:1.22-bookworm go build ./... 2>&1
  Must return zero output. Air serves stale binary silently.

FRONTEND COMPILE GATE:
  cd frontend && npx tsc -p tsconfig.app.json --noEmit 2>&1
  Must return zero errors.

CURRENT BLOCKERS:
  {chr(10).join([f"- {b}" for b in CURRENT_STATUS['blockers']])}

WHAT IS VERIFIED WORKING (200s):
  {', '.join(CURRENT_STATUS['backend']['registered_routes'].keys())}

NON-NEGOTIABLES:
  - inventory_events is append-only — never update balances directly
  - No raw SQL string concatenation — sqlc only
  - No alert() in frontend — InlineAlert component only
  - No hardcoded hex colors — CSS variables only
  - Every API change: curl test before claiming done
  - Every Go change: compile gate before claiming done
"""
        return txt(ctx)

    elif name == "get_db_schema_rules":
        return txt(json.dumps(DB_SCHEMA_RULES, indent=2))

    elif name == "get_migration_model":
        return txt(json.dumps(MIGRATION_MODEL, indent=2))

    return txt(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
