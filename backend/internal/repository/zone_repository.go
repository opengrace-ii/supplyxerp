package repository

import (
	"context"
	"fmt"
)

type ZoneRepository struct {
	db DBTX
}

type Zone struct {
	ID       int64  `json:"id"`
	PublicID string `json:"public_id"`
	Code     string `json:"code"`
	Name     string `json:"name"`
	ZoneType string `json:"zone_type"`
}

func (r *ZoneRepository) GetByCode(ctx context.Context, tenantID int64, code string) (*Zone, error) {
	var z Zone
	err := r.db.QueryRow(ctx, `
		SELECT id, public_id, code, name, zone_type 
		FROM zones 
		WHERE tenant_id = $1 AND code = $2`, tenantID, code).
		Scan(&z.ID, &z.PublicID, &z.Code, &z.Name, &z.ZoneType)
		
	if err != nil {
		return nil, fmt.Errorf("zone not found")
	}
	return &z, nil
}

func (r *ZoneRepository) GetDb() DBTX {
	return r.db
}

func (r *ZoneRepository) GetSiteID(ctx context.Context, zoneID int64) int64 {
	var siteID int64
	r.db.QueryRow(ctx, "SELECT site_id FROM zones WHERE id = $1", zoneID).Scan(&siteID)
	return siteID
}
