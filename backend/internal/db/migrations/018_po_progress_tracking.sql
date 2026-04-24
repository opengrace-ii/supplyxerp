-- 018_po_progress_tracking.sql
-- Phase 3: PO Progress Tracking (SAP 10.5)

-- 1. Milestone Tracking Scenarios
CREATE TABLE IF NOT EXISTS po_tracking_scenarios (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- 2. Scenario Milestone Events
CREATE TABLE IF NOT EXISTS po_tracking_scenario_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_code TEXT NOT NULL REFERENCES po_tracking_scenarios(code),
    event_code TEXT NOT NULL,
    event_description TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    planned_offset_days INTEGER NOT NULL DEFAULT 0, -- offset from baseline
    UNIQUE(scenario_code, event_code),
    UNIQUE(scenario_code, sequence_no)
);

-- 3. PO Item Progress (Instances)
CREATE TABLE IF NOT EXISTS po_item_progress (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id),
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_no INTEGER NOT NULL, -- references purchase_order_lines.line_number
    event_code TEXT NOT NULL,
    event_description TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    baseline_date DATE NOT NULL,
    plan_date DATE NOT NULL,
    forecast_date DATE,
    actual_date DATE,
    variance_days INTEGER DEFAULT 0,
    rag_status TEXT NOT NULL DEFAULT 'GRAY', -- GRAY, GREEN, YELLOW, RED
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(po_id, item_no, event_code)
);

-- Seed Scenarios
INSERT INTO po_tracking_scenarios (code, name, description) VALUES
('IMPORT', 'Standard Import Flow', 'Milestones for international sea/air freight procurement'),
('LOCAL', 'Domestic / Local Flow', 'Simple tracking for domestic suppliers'),
('SERVICE', 'Service Delivery', 'Timeline for service-based work orders')
ON CONFLICT (code) DO NOTHING;

-- Seed Milestone Events for IMPORT
INSERT INTO po_tracking_scenario_events (scenario_code, event_code, event_description, sequence_no, planned_offset_days) VALUES
('IMPORT', 'PO_SENT', 'PO Sent to Supplier', 1, 0),
('IMPORT', 'ACK_REC', 'Order Acknowledgment Received', 2, 2),
('IMPORT', 'LC_OPEN', 'Letter of Credit Opened', 3, 5),
('IMPORT', 'PRE_INSP', 'Pre-shipment Inspection', 4, 10),
('IMPORT', 'BOOKING', 'Vessel/Flight Booking Confirmed', 5, 12),
('IMPORT', 'SHIPPED', 'Goods Shipped (ETD)', 6, 15),
('IMPORT', 'ARRIVED', 'Goods Arrived at Port (ETA)', 7, 30),
('IMPORT', 'CUSTOMS', 'Customs Clearance Complete', 8, 35),
('IMPORT', 'WH_REC', 'Warehouse Arrival', 9, 38),
('IMPORT', 'PUTAWAY', 'Final Putaway Complete', 10, 40)
ON CONFLICT DO NOTHING;

-- Seed Milestone Events for LOCAL
INSERT INTO po_tracking_scenario_events (scenario_code, event_code, event_description, sequence_no, planned_offset_days) VALUES
('LOCAL', 'PO_SENT', 'PO Sent to Supplier', 1, 0),
('LOCAL', 'ACK_REC', 'Order Acknowledgment Received', 2, 1),
('LOCAL', 'READY', 'Goods Ready for Collection', 3, 5),
('LOCAL', 'DISPATCH', 'Goods Dispatched', 4, 6),
('LOCAL', 'RECEIVED', 'Goods Received at Site', 5, 7)
ON CONFLICT DO NOTHING;

-- Seed Milestone Events for SERVICE
INSERT INTO po_tracking_scenario_events (scenario_code, event_code, event_description, sequence_no, planned_offset_days) VALUES
('SERVICE', 'PO_SENT', 'Service PO Sent', 1, 0),
('SERVICE', 'KICKOFF', 'Project Kickoff Meeting', 2, 3),
('SERVICE', 'PROGRESS', 'Mid-point Progress Review', 3, 15),
('SERVICE', 'COMPLETE', 'Service Completion / Handoff', 4, 30)
ON CONFLICT DO NOTHING;
