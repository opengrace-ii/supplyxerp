package repository

import (
	"context"

	"supplyxerp/backend/internal/db/dbgen"
	"github.com/jackc/pgx/v5/pgtype"
)

type EventRepository struct {
	db DBTX
}

func (r *EventRepository) Create(ctx context.Context, arg dbgen.CreateInventoryEventParams) (dbgen.InventoryEvent, error) {
	q := dbgen.New(r.db)
	return q.CreateInventoryEvent(ctx, arg)
}

func (r *EventRepository) ListRecent(ctx context.Context, tenantID int64, limit int32) ([]dbgen.ListRecentEventsRow, error) {
	q := dbgen.New(r.db)
	return q.ListRecentEvents(ctx, dbgen.ListRecentEventsParams{
		TenantID: pgtype.Int8{Int64: tenantID, Valid: true},
		Limit:    limit,
	})
}

type CreateEventZoneParams struct {
	TenantID    int64
	EventType   string
	HuID        int64
	ProductID   *int64
	FromZoneID  *int64
	ToZoneID    *int64
	FromSiteID  *int64
	ToSiteID    *int64
	Quantity    float64
	Unit        string
	ActorUserID int64
	Metadata    []byte
}

func (r *EventRepository) CreateWithZone(ctx context.Context, arg CreateEventZoneParams) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO inventory_events (
			tenant_id, event_type, hu_id, product_id, 
			zone_id, site_id,
			quantity, unit, actor_user_id, metadata
		) VALUES (
			$1, $2, $3, $4, 
			$5, $6,
			$7, $8, $9, $10
		) RETURNING id
	`, 	
		arg.TenantID, arg.EventType, arg.HuID, arg.ProductID, 
		arg.ToZoneID, arg.ToSiteID,
		arg.Quantity, arg.Unit, arg.ActorUserID, arg.Metadata,
	).Scan(&id)
	return id, err
}
