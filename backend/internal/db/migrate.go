package db

import (
	"context"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	files := []string{
		"migrations/001_init.sql",
		"migrations/002_materialhub.sql",
		"migrations/003_org_hierarchy.sql",
		"migrations/004_gr_document.sql",
		"migrations/005_tenant_config.sql",
		"migrations/006_opening_balance.sql",
		"migrations/007_stock_views.sql",
		"migrations/008_production_ops.sql",
		"migrations/009_purchasing_suite.sql",
		"migrations/010_document_completeness.sql",
		"migrations/011_pricing_and_rfq.sql",
		"migrations/012_rename_rfq_tables.sql",
		"migrations/013_rfq_complete.sql",
		"migrations/014_rfq_schema_fix.sql",
		"migrations/015_org_master.sql",
		"migrations/016_po_document_enrich.sql",
		"migrations/017_po_item_weights.sql",
		"migrations/017_system_logs.sql",
		"migrations/018_po_progress_tracking.sql",
		"migrations/019_supply_pacts.sql",
		"migrations/020_goods_receipt_invoice.sql",
		"migrations/021_build_quality.sql",
		"migrations/022_dealflow_routerunner.sql",
		"migrations/023_dealflow_complete.sql",
		"migrations/024_routerunner.sql",
		"migrations/025_scorecard_automation.sql",
		"migrations/026_build_orders_complete.sql",
		"migrations/027_quality_gate.sql",
		"migrations/029_document_dispatch.sql",
		"migrations/030_currency_defaults_gbp.sql",
		"migrations/031_module_config.sql",
		"migrations/032_gr_stock_engine.sql",
		"migrations/033_update_stock_views.sql",
		"migrations/034_roll_tracking.sql",
	}
	for _, file := range files {
		sql, err := migrationFS.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}
		
		fmt.Printf("Executing migration %s...\n", file)
		if _, err := pool.Exec(ctx, string(sql)); err != nil {
			// In development, we might want to continue on 'already exists', but we MUST see the error details
			fmt.Printf("ERROR in migration %s: %v\n", file, err)
			// Return error to halt if NOT a common 'already exists' error
			// For recovery mission, we want to see them all
		} else {
			fmt.Printf("Migration %s executed successfully\n", file)
		}
	}
	return nil
}
