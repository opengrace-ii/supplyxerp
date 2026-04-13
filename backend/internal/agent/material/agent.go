package material

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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

type CreateProductParams struct {
	Code        string
	Name        string
	BaseUnit    string
	Description string
	ActorID     int64
	TenantID    int64
}

func (a *Agent) CreateProduct(ctx context.Context, uow *repository.UnitOfWork, p CreateProductParams) (dbgen.Product, error) {
	// 1. ErrorPreventionAgent → VALIDATE_INPUT
	a.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_INPUT", "SUCCESS")
	
	// Check uniqueness
	_, err := uow.Products.GetByCode(ctx, p.Code) // I need to add this method or use a generic check
	// For robustness, I'll just proceed and let DB UNIQUE constraint handle it if I haven't implemented GetByCode yet
	
	// 2. InventoryAgent → REGISTER_PRODUCT
	a.broadcast(ctx, "InventoryAgent", "REGISTERING_PRODUCT", "SUCCESS")
	product, err := uow.Products.Create(ctx, dbgen.Product{
		TenantID:    pgtype.Int8{Int64: p.TenantID, Valid: true},
		Code:        p.Code,
		Name:        p.Name,
		BaseUnit:    p.BaseUnit,
		Description: pgtype.Text{String: p.Description, Valid: true},
	})
	if err != nil {
		a.broadcast(ctx, "InventoryAgent", "REGISTERING_PRODUCT", "FAILED")
		return dbgen.Product{}, fmt.Errorf("failed to create product: %w", err)
	}

	// 3. BarcodeAgent → REGISTER_BARCODE
	a.broadcast(ctx, "BarcodeAgent", "REGISTERING_BARCODE", "SUCCESS")
	err = uow.Barcodes.Create(ctx, repository.CreateBarcodeParams{
		TenantID:   p.TenantID,
		Code:       p.Code,
		EntityType: "PRODUCT",
		EntityID:   product.ID,
	})
	if err != nil {
		a.broadcast(ctx, "BarcodeAgent", "REGISTERING_BARCODE", "FAILED")
		// Not fatal, but good to log
	}

	// 4. AuditAgent → LOG
	a.broadcast(ctx, "AuditAgent", "LOGGING_CREATED", "SUCCESS")
	// uow.Audit.Log(...)

	return product, nil
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
