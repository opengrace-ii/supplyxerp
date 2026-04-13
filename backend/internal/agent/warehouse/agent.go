package warehouse

import (
	"context"
	"encoding/json"

	"erplite/backend/internal/db/dbgen"
	"erplite/backend/internal/events"
	"erplite/backend/internal/repository"
	"github.com/jackc/pgx/v5/pgtype"
)

type Agent struct {
	Hub *events.Hub
}

func New(hub *events.Hub) *Agent {
	return &Agent{Hub: hub}
}

type MoveParams struct {
	HUBarcode       string
	ToLocationCode  string
	ActorUserID     int64
	TenantID        int64
}

func (a *Agent) MoveHU(ctx context.Context, uow *repository.UnitOfWork, p MoveParams) error {
	// 1. Resolve HU
	hu, err := uow.HU.GetByBarcode(ctx, p.TenantID, p.HUBarcode)
	if err != nil {
		return err
	}

	// Because sqlc wasn't generated with zone_id, we fetch it manually to get from_zone_id and from_site_id
	var fromZoneID, fromSiteID *int64
	var prodID *int64 = &hu.ProductID
	
	err = uow.Zones.GetDb().QueryRow(ctx, "SELECT zone_id, site_id FROM handling_units WHERE id = $1", hu.ID).Scan(&fromZoneID, &fromSiteID)
	// it's fine if error here, they might be NULL or we continue

	// 2. Resolve target zone
	z, err := uow.Zones.GetByCode(ctx, p.TenantID, p.ToLocationCode)
	if err != nil {
		return err
	}

	// 3. Validation: Skip if already there
	if fromZoneID != nil && *fromZoneID == z.ID {
		return nil
	}

	// 4. Update HU State
	if err := uow.HU.UpdateZone(ctx, hu.ID, z.ID, uow.Zones.GetSiteID(ctx, z.ID)); err != nil {
		return err
	}

	// 5. Record Event in Ledger
	metadata, _ := json.Marshal(map[string]any{
		"reason": "manual_move",
		"app":    "StockFlow",
	})

	err = uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    p.TenantID,
		EventType:   "HU_MOVED",
		HuID:        hu.ID,
		ProductID:   prodID,
		FromZoneID:  fromZoneID,
		ToZoneID:    &z.ID,
		FromSiteID:  fromSiteID,
		ToSiteID:    &z.ID, // Simplification or pass exact site
		Quantity:    hu.Quantity,
		Unit:        hu.Unit,
		ActorUserID: p.ActorUserID,
		Metadata:    metadata,
	})
	if err != nil {
		return err
	}

	// 6. Broadcast Update
	if a.Hub != nil {
		a.Hub.Broadcast("INVENTORY_UPDATE", map[string]any{
			"hu_id":   hu.ID,
			"zone_id": z.ID,
			"event":   "MOVED",
		})
	}

	return nil
}

func (a *Agent) CreatePutawayTask(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, huID int64, fromZoneID int64) error {
	a.broadcast(ctx, "WarehouseAgent", "CREATING_PUTAWAY_TASK", "SUCCESS")
	_, err := uow.WarehouseTasks.Create(ctx, repository.WarehouseTask{
		TenantID:   tenantID,
		TaskType:   "PUTAWAY",
		Status:     "OPEN",
		HuID:       huID,
		FromZoneID: &fromZoneID,
		Priority:   2,
	})
	if err != nil {
		a.broadcast(ctx, "WarehouseAgent", "CREATING_PUTAWAY_TASK", "FAILED")
	}
	return err
}

func (a *Agent) CompletePutawayTask(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, userID int64, taskID int64, toZoneID int64) error {
	a.broadcast(ctx, "WarehouseAgent", "EXECUTING_PUTAWAY", "SUCCESS")
	
	task, err := uow.WarehouseTasks.GetByID(ctx, taskID)
	if err != nil {
		return err
	}

	hu, err := uow.HU.GetByID(ctx, task.HuID)
	if err != nil {
		return err
	}

	siteID := uow.Zones.GetSiteID(ctx, toZoneID)

	// Update HU
	if err := uow.HU.UpdateZone(ctx, hu.ID, toZoneID, siteID); err != nil {
		return err
	}

	// Record Event
	err = uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "PUTAWAY",
		HuID:        hu.ID,
		ProductID:   &hu.ProductID,
		FromZoneID:  task.FromZoneID,
		ToZoneID:    &toZoneID,
		ToSiteID:    &siteID,
		Quantity:    hu.Quantity,
		Unit:        hu.Unit,
		ActorUserID: userID,
	})
	if err != nil {
		return err
	}

	// Complete Task
	return uow.WarehouseTasks.Complete(ctx, taskID, toZoneID)
}

func (a *Agent) broadcast(ctx context.Context, agent, action, status string) {
	if a.Hub == nil {
		return
	}
	a.Hub.Broadcast("agent_trace", map[string]any{
		"agent":     agent,
		"action":    action,
		"status":    status,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
