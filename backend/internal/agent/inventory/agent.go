import (
	"context"
	"fmt"
	"time"

	"erplite/backend/internal/events"
	"erplite/backend/internal/repository"
)

type Agent struct {
	Hub *events.Hub
}

func New(hub *events.Hub) *Agent {
	return &Agent{Hub: hub}
}

type CreateHUInput struct {
	TenantID   int64
	ProductID  int64
	Code       string
	Quantity   float64
	Unit       string
	SiteID     int64
	ZoneID     int64
	Status     string
}

func (a *Agent) CreateHU(ctx context.Context, uow *repository.UnitOfWork, in CreateHUInput) (int64, error) {
	a.broadcast(ctx, "InventoryAgent", "CREATING_HU", "SUCCESS")
	
	var huID int64
	err := uow.Zones.GetDb().QueryRow(ctx, `
		INSERT INTO handling_units (tenant_id, product_id, code, quantity, unit, site_id, zone_id, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, in.TenantID, in.ProductID, in.Code, in.Quantity, in.Unit, in.SiteID, in.ZoneID, in.Status).Scan(&huID)
	
	if err != nil {
		a.broadcast(ctx, "InventoryAgent", "CREATING_HU", "FAILED")
		return 0, err
	}
	return huID, nil
}

func (a *Agent) PostInboundEvent(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, huID int64, productID int64, quantity float64, unit string, siteID int64, zoneID int64, actorID int64, refType string, refID int64) error {
	a.broadcast(ctx, "InventoryAgent", "POSTING_LEDGER_EVENT", "SUCCESS")
	
	// Create inventory event
	err := uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "GR",
		HuID:        huID,
		ProductID:   &productID,
		ToZoneID:    &zoneID,
		ToSiteID:    &siteID,
		Quantity:    quantity,
		Unit:        unit,
		ActorUserID: actorID,
		Metadata:    []byte(fmt.Sprintf(`{"reference_type": "%s", "reference_id": %d}`, refType, refID)),
	})
	
	if err != nil {
		a.broadcast(ctx, "InventoryAgent", "POSTING_LEDGER_EVENT", "FAILED")
	}
	return err
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
