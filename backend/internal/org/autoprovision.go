package org

import (
	"context"
	"fmt"

	"supplyxerp/backend/internal/events"
	"github.com/jackc/pgx/v5"
)

func AutoProvisionTenant(ctx context.Context, tx pgx.Tx, tenantID int64, tenantName string, hub *events.Hub) error {
	// 1. Insert Organisation
	var orgID int64
	err := tx.QueryRow(ctx, `
		INSERT INTO organisations (tenant_id, name, currency, fiscal_year_start)
		VALUES ($1, $2, 'USD', 1)
		RETURNING id
	`, tenantID, tenantName).Scan(&orgID)
	if err != nil {
		return fmt.Errorf("failed to auto-provision organisation: %w", err)
	}

	// 2. Insert Site
	var siteID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO sites (tenant_id, organisation_id, code, name)
		VALUES ($1, $2, 'SITE-01', 'Main Site')
		RETURNING id
	`, tenantID, orgID).Scan(&siteID)
	if err != nil {
		return fmt.Errorf("failed to auto-provision default site: %w", err)
	}

	// 3. Insert Zones
	zones := []struct {
		Code     string
		Name     string
		ZoneType string
	}{
		{"RECV-01", "Receiving Bay", "RECEIVING"},
		{"STOR-01", "Main Storage", "STORAGE"},
		{"PROD-01", "Production Floor", "PRODUCTION"},
		{"DISP-01", "Dispatch Bay", "DISPATCH"},
	}

	var zoneIDs []int64
	for _, z := range zones {
		var zID int64
		err = tx.QueryRow(ctx, `
			INSERT INTO zones (tenant_id, site_id, code, name, zone_type)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, tenantID, siteID, z.Code, z.Name, z.ZoneType).Scan(&zID)
		if err != nil {
			return fmt.Errorf("failed to auto-provision zone %s: %w", z.Code, err)
		}
		zoneIDs = append(zoneIDs, zID)
	}

	// 4. Insert Tenant Config
	_, err = tx.Exec(ctx, `
		INSERT INTO tenant_config (tenant_id, domain_profile, default_uom)
		VALUES ($1, 'GENERAL', 'QTY')
	`, tenantID)
	if err != nil {
		return fmt.Errorf("failed to auto-provision tenant config: %w", err)
	}

	// 5. Initialize Sequences
	seqTypes := []string{"GR", "PO", "HU", "SO"}
	for _, st := range seqTypes {
		_, err = tx.Exec(ctx, `
			INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
			VALUES ($1, $2, 0)
		`, tenantID, st)
		if err != nil {
			return fmt.Errorf("failed to initialize sequence %s: %w", st, err)
		}
	}

	// 6. Broadcast Event (Simulating the format required)
	if hub != nil {
	    // The hub.Broadcast accepts internal events. It connects to the frontend event system.
		hub.Broadcast("org_provisioned", map[string]interface{}{
			"tenant_id": tenantID,
			"org_id":    orgID,
			"site_id":   siteID,
			"zones":     zoneIDs,
		})
	}

	return nil
}
