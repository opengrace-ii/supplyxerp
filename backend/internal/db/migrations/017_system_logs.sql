BEGIN;

CREATE TABLE IF NOT EXISTS system_logs (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level         VARCHAR(10)  NOT NULL DEFAULT 'INFO',
    -- INFO, WARN, ERROR, DEBUG
    category      VARCHAR(30)  NOT NULL DEFAULT 'API',
    -- API, AUTH, DB, FRONTEND, SYSTEM, BUSINESS
    method        VARCHAR(10),
    -- HTTP method: GET, POST, PUT, DELETE, PATCH
    path          TEXT,
    -- full request path e.g. /api/po/123/items/10/block
    status_code   INT,
    -- HTTP response status code
    duration_ms   INT,
    -- how long the request took in milliseconds
    user_id       VARCHAR(100),
    -- username or user_id from JWT
    tenant_id     INT,
    ip_address    VARCHAR(45),
    request_body  TEXT,
    -- truncated to 2000 chars max
    response_body TEXT,
    -- truncated to 2000 chars max, only on errors
    error_message TEXT,
    -- full error string on failures
    stack_trace   TEXT,
    -- Go panic stack trace if applicable
    module        VARCHAR(50),
    -- which ERP module: PO, RFQ, MaterialHub, OrgMaster, Auth
    function_name VARCHAR(100),
    -- Go handler function name
    metadata      JSONB
    -- any extra key-value pairs
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at
    ON system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level
    ON system_logs (level);
CREATE INDEX IF NOT EXISTS idx_system_logs_status_code
    ON system_logs (status_code);
CREATE INDEX IF NOT EXISTS idx_system_logs_path
    ON system_logs (path);
CREATE INDEX IF NOT EXISTS idx_system_logs_category
    ON system_logs (category);

COMMIT;
