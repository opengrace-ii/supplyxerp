package warehouse

import (
	"context"
	"time"

	"erplite/backend/internal/agent/inventory"
	"erplite/backend/internal/domain"
	"erplite/backend/internal/repository"
	"erplite/backend/internal/utils"
	"github.com/google/uuid"
)

type Agent struct {
	inventory *inventory.Agent
}

type PutawayInput struct {
	HU          domain.HU
	ToLocation  string
	ActorUserID string
}

type MoveInput struct {
	HU           domain.HU
	FromLocation string
	ToLocation   string
	ActorUserID  string
}

func New(inventoryAgent *inventory.Agent) *Agent {
	return &Agent{inventory: inventoryAgent}
}

func (a *Agent) Putaway(ctx context.Context, uow *repository.UnitOfWork, input PutawayInput) (domain.HU, domain.WarehouseTask, error) {
	if input.ToLocation == "" {
		return domain.HU{}, domain.WarehouseTask{}, utils.NewAppError(400, "INVALID_LOCATION", "putaway location is required")
	}
	before := input.HU
	after := input.HU
	after.LocationCode = input.ToLocation
	after.Status = domain.HUStatusStored

	from := before.LocationCode
	to := after.LocationCode
	if err := a.inventory.PersistEventAndState(
		ctx,
		uow,
		before,
		after,
		domain.EventHUStored,
		0,
		&from,
		&to,
		input.ActorUserID,
		map[string]any{"operation": "putaway"},
	); err != nil {
		return domain.HU{}, domain.WarehouseTask{}, err
	}

	task := domain.WarehouseTask{
		ID:           uuid.NewString(),
		TaskType:     "PUTAWAY",
		HUID:         after.ID,
		FromLocation: &from,
		ToLocation:   &to,
		Status:       "DONE",
		CreatedBy:    input.ActorUserID,
		CreatedAt:    time.Now().UTC(),
	}
	if err := uow.WarehouseTasks.Create(ctx, task); err != nil {
		return domain.HU{}, domain.WarehouseTask{}, err
	}

	return after, task, nil
}

func (a *Agent) Move(ctx context.Context, uow *repository.UnitOfWork, input MoveInput) (domain.HU, domain.WarehouseTask, error) {
	if input.ToLocation == "" {
		return domain.HU{}, domain.WarehouseTask{}, utils.NewAppError(400, "INVALID_LOCATION", "target location is required")
	}
	if input.FromLocation == input.ToLocation {
		return domain.HU{}, domain.WarehouseTask{}, utils.NewAppError(400, "INVALID_MOVE", "source and target locations must differ")
	}

	before := input.HU
	after := input.HU
	after.LocationCode = input.ToLocation
	after.Status = domain.HUStatusStored

	from := input.FromLocation
	to := input.ToLocation
	if err := a.inventory.PersistEventAndState(
		ctx,
		uow,
		before,
		after,
		domain.EventHUMoved,
		0,
		&from,
		&to,
		input.ActorUserID,
		map[string]any{"operation": "move"},
	); err != nil {
		return domain.HU{}, domain.WarehouseTask{}, err
	}

	task := domain.WarehouseTask{
		ID:           uuid.NewString(),
		TaskType:     "MOVE",
		HUID:         after.ID,
		FromLocation: &from,
		ToLocation:   &to,
		Status:       "DONE",
		CreatedBy:    input.ActorUserID,
		CreatedAt:    time.Now().UTC(),
	}
	if err := uow.WarehouseTasks.Create(ctx, task); err != nil {
		return domain.HU{}, domain.WarehouseTask{}, err
	}

	return after, task, nil
}
