package inventory

import (
	"context"
	"time"

	"erplite/backend/internal/domain"
	"erplite/backend/internal/repository"
	"erplite/backend/internal/utils"
	"github.com/google/uuid"
)

type Agent struct{}

type CreateHUInput struct {
	Code         string
	MaterialCode string
	Quantity     float64
	UOM          string
	LocationCode string
	Status       domain.HUStatus
	ParentHUID   *string
	ActorUserID  string
}

func New() *Agent {
	return &Agent{}
}

func (a *Agent) CreateHU(ctx context.Context, uow *repository.UnitOfWork, input CreateHUInput) (domain.HU, error) {
	if input.Quantity <= 0 {
		return domain.HU{}, utils.NewAppError(400, "INVALID_QUANTITY", "quantity must be greater than zero")
	}

	hu := domain.HU{
		ID:            uuid.NewString(),
		Code:          input.Code,
		MaterialCode:  input.MaterialCode,
		Quantity:      input.Quantity,
		UOM:           input.UOM,
		Status:        input.Status,
		LocationCode:  input.LocationCode,
		ParentHUID:    input.ParentHUID,
		LabelVersion:  1,
		CreatedBy:     input.ActorUserID,
		CreatedAt:     time.Now().UTC(),
		LastEventAt:   time.Now().UTC(),
	}

	if err := uow.HU.Create(ctx, hu); err != nil {
		return domain.HU{}, err
	}
	return hu, nil
}

func (a *Agent) EnsureStockIntegrity(hu domain.HU, movementQty float64) error {
	if hu.Quantity <= 0 {
		return utils.NewAppError(409, "HU_EMPTY", "HU has no available quantity")
	}
	if movementQty <= 0 {
		return utils.NewAppError(400, "INVALID_QUANTITY", "movement quantity must be positive")
	}
	if movementQty > hu.Quantity {
		return utils.NewAppError(409, "INSUFFICIENT_STOCK", "movement quantity exceeds HU stock")
	}
	return nil
}

func (a *Agent) PersistEventAndState(
	ctx context.Context,
	uow *repository.UnitOfWork,
	before domain.HU,
	after domain.HU,
	eventType domain.EventType,
	quantityDelta float64,
	fromLocation *string,
	toLocation *string,
	actorUserID string,
	metadata map[string]any,
) error {
	event := domain.HUEvent{
		ID:            uuid.NewString(),
		HUID:          before.ID,
		EventType:     eventType,
		QuantityDelta: quantityDelta,
		FromLocation:  fromLocation,
		ToLocation:    toLocation,
		ActorUserID:   actorUserID,
		Metadata:      metadata,
		BeforeState: map[string]any{
			"id":            before.ID,
			"code":          before.Code,
			"quantity":      before.Quantity,
			"status":        before.Status,
			"location_code": before.LocationCode,
			"label_version": before.LabelVersion,
		},
		AfterState: map[string]any{
			"id":            after.ID,
			"code":          after.Code,
			"quantity":      after.Quantity,
			"status":        after.Status,
			"location_code": after.LocationCode,
			"label_version": after.LabelVersion,
		},
	}

	if err := uow.Events.AppendHUEvent(ctx, event); err != nil {
		return err
	}
	return uow.HU.UpdateState(ctx, after)
}
