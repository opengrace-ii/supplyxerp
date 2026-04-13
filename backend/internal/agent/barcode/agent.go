package barcode

import (
	"context"
	"fmt"
	"time"

	"erplite/backend/internal/db/dbgen"
	"erplite/backend/internal/events"
	"erplite/backend/internal/repository"
)

type Agent struct {
	Hub *events.Hub
}

func New(hub *events.Hub) *Agent {
	return &Agent{Hub: hub}
}

type ResolvedEntity struct {
	Type string
	ID   int64
	Data any
}

func (a *Agent) Resolve(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, code string) (*ResolvedEntity, error) {
	a.broadcast(ctx, "BarcodeAgent", "RESOLVING_BARCODE", "SUCCESS")

	// 1. Resolve in barcodes table
	b, err := uow.Barcodes.GetByCode(ctx, tenantID, code)
	if err == nil {
		switch b.EntityType {
		case "PRODUCT":
			p, _ := uow.Products.GetByCode(ctx, tenantID, b.Code)
			return &ResolvedEntity{Type: "PRODUCT", ID: p.ID, Data: p}, nil
		case "HU":
			hu, _ := uow.HU.GetWithDetails(ctx, b.EntityID)
			return &ResolvedEntity{Type: "HU", ID: hu.ID, Data: hu}, nil
		case "LOCATION", "ZONE":
			// For backward compatibility keep LOCATION string, but query zones
			z, err := uow.Zones.GetByCode(ctx, tenantID, b.Code)
			if err == nil {
				return &ResolvedEntity{Type: "LOCATION", ID: z.ID, Data: z}, nil
			}
		}
	}

	// 2. Fallback to direct HU code (HU-XXXX)
	hu, err := uow.HU.GetByBarcode(ctx, tenantID, code)
	if err == nil {
		details, _ := uow.HU.GetWithDetails(ctx, hu.ID)
		return &ResolvedEntity{Type: "HU", ID: hu.ID, Data: details}, nil
	}

	// 3. Fallback to direct Zone code
	z, err := uow.Zones.GetByCode(ctx, tenantID, code)
	if err == nil {
		return &ResolvedEntity{Type: "LOCATION", ID: z.ID, Data: z}, nil
	}

	a.broadcast(ctx, "BarcodeAgent", "RESOLVING_BARCODE", "FAILED")
	return nil, fmt.Errorf("barcode %s not recognized", code)
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
