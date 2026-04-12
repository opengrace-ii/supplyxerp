package production

import (
	"context"
	"fmt"

	"erplite/backend/internal/agent/inventory"
	"erplite/backend/internal/domain"
	"erplite/backend/internal/repository"
	"erplite/backend/internal/utils"
	"github.com/google/uuid"
)

type Agent struct {
	inventory *inventory.Agent
}

type ConsumeInput struct {
	SourceHU    domain.HU
	ConsumeQty  float64
	ActorUserID string
}

// ConsumeResult — after consume, the parent HU retains its identity with
// reduced quantity. A new child HU is created with the consumed portion.
type ConsumeResult struct {
	ParentHU domain.HU `json:"parent_hu"`
	ChildHU  domain.HU `json:"child_hu"`
}

type SplitInput struct {
	SourceHU    domain.HU
	SplitQty    float64
	ActorUserID string
}

type SplitResult struct {
	ParentHU domain.HU `json:"parent_hu"`
	ChildHU  domain.HU `json:"child_hu"`
}

func New(inventoryAgent *inventory.Agent) *Agent {
	return &Agent{inventory: inventoryAgent}
}

// ConsumeWithSplit implements the correct SAP EWM split logic:
//
//	HU-PARENT (315 KG, STOR-01, status=AVAILABLE)
//	  → consume 50 KG
//	HU-PARENT (265 KG, STOR-01, status=AVAILABLE)  ← updated in place
//	HU-CHILD  (50 KG, PROD-01, status=IN_USE)       ← new row, parent_hu_id = HU-PARENT.id
//
// Identity is NEVER broken. HU-PARENT retains its ID and label version is
// incremented. HU-CHILD gets a new ID but carries parent_hu_id.
func (a *Agent) ConsumeWithSplit(ctx context.Context, uow *repository.UnitOfWork, input ConsumeInput) (ConsumeResult, error) {
	if err := a.inventory.EnsureStockIntegrity(input.SourceHU, input.ConsumeQty); err != nil {
		return ConsumeResult{}, err
	}

	sourceBefore := input.SourceHU

	// Parent HU: updated in-place with reduced quantity, label version incremented.
	parentAfter := input.SourceHU
	parentAfter.Quantity = input.SourceHU.Quantity - input.ConsumeQty
	parentAfter.LabelVersion = input.SourceHU.LabelVersion + 1
	// Parent keeps its status AVAILABLE (it still has stock)
	if parentAfter.Quantity == 0 {
		parentAfter.Status = domain.HUStatusConsumed
	}

	// Child HU: new row with consumed quantity, status IN_USE, location PROD-01.
	childCode := fmt.Sprintf("%s-C-%s", input.SourceHU.Code, uuid.NewString()[0:8])
	childHU, err := a.inventory.CreateHU(ctx, uow, inventory.CreateHUInput{
		Code:         childCode,
		MaterialCode: input.SourceHU.MaterialCode,
		Quantity:     input.ConsumeQty,
		UOM:          input.SourceHU.UOM,
		LocationCode: "PROD-01",
		Status:       domain.HUStatusInUse,
		ParentHUID:   &input.SourceHU.ID,
		ActorUserID:  input.ActorUserID,
	})
	if err != nil {
		return ConsumeResult{}, err
	}
	if err := uow.Barcodes.Bind(ctx, childHU.Code, "HU", childHU.ID); err != nil {
		return ConsumeResult{}, err
	}

	// Persist the parent HU state change (update in place).
	if err := a.inventory.PersistEventAndState(
		ctx,
		uow,
		sourceBefore,
		parentAfter,
		domain.EventHUSplit,
		-input.ConsumeQty,
		nil,
		nil,
		input.ActorUserID,
		map[string]any{
			"operation":         "consume_with_split",
			"child_hu_id":       childHU.ID,
			"child_hu_code":     childHU.Code,
			"consumed_quantity": input.ConsumeQty,
		},
	); err != nil {
		return ConsumeResult{}, err
	}

	// Record creation event for the child HU.
	if err := uow.Events.AppendHUEvent(ctx, domain.HUEvent{
		ID:            uuid.NewString(),
		HUID:          childHU.ID,
		EventType:     domain.EventHUConsumed,
		QuantityDelta: input.ConsumeQty,
		ActorUserID:   input.ActorUserID,
		Metadata:      map[string]any{"origin_hu_id": input.SourceHU.ID, "origin_hu_code": input.SourceHU.Code},
		BeforeState:   map[string]any{},
		AfterState: map[string]any{
			"id":            childHU.ID,
			"code":          childHU.Code,
			"quantity":      childHU.Quantity,
			"status":        childHU.Status,
			"location_code": childHU.LocationCode,
		},
	}); err != nil {
		return ConsumeResult{}, err
	}

	return ConsumeResult{
		ParentHU: parentAfter,
		ChildHU:  childHU,
	}, nil
}

// SplitOnly splits a quantity from the source HU into a new child HU.
// The parent HU retains its identity with reduced quantity.
func (a *Agent) SplitOnly(ctx context.Context, uow *repository.UnitOfWork, input SplitInput) (SplitResult, error) {
	if err := a.inventory.EnsureStockIntegrity(input.SourceHU, input.SplitQty); err != nil {
		return SplitResult{}, err
	}
	if input.SplitQty >= input.SourceHU.Quantity {
		return SplitResult{}, utils.NewAppError(409, "INVALID_SPLIT_QUANTITY", "split quantity must be less than source quantity")
	}

	sourceBefore := input.SourceHU

	// Parent HU: updated in-place with reduced quantity.
	parentAfter := input.SourceHU
	parentAfter.Quantity = input.SourceHU.Quantity - input.SplitQty
	parentAfter.LabelVersion = input.SourceHU.LabelVersion + 1

	// Child HU: new row with split quantity, same location, AVAILABLE status.
	childCode := fmt.Sprintf("%s-S-%s", input.SourceHU.Code, uuid.NewString()[0:8])
	childHU, err := a.inventory.CreateHU(ctx, uow, inventory.CreateHUInput{
		Code:         childCode,
		MaterialCode: input.SourceHU.MaterialCode,
		Quantity:     input.SplitQty,
		UOM:          input.SourceHU.UOM,
		LocationCode: input.SourceHU.LocationCode,
		Status:       domain.HUStatusAvailable,
		ParentHUID:   &input.SourceHU.ID,
		ActorUserID:  input.ActorUserID,
	})
	if err != nil {
		return SplitResult{}, err
	}
	if err := uow.Barcodes.Bind(ctx, childHU.Code, "HU", childHU.ID); err != nil {
		return SplitResult{}, err
	}

	// Persist parent HU state change (update in place).
	if err := a.inventory.PersistEventAndState(
		ctx,
		uow,
		sourceBefore,
		parentAfter,
		domain.EventHUSplit,
		-input.SplitQty,
		nil,
		nil,
		input.ActorUserID,
		map[string]any{
			"operation":      "split_only",
			"child_hu_id":    childHU.ID,
			"child_hu_code":  childHU.Code,
			"split_quantity": input.SplitQty,
		},
	); err != nil {
		return SplitResult{}, err
	}

	// Record creation event for child HU.
	if err := uow.Events.AppendHUEvent(ctx, domain.HUEvent{
		ID:            uuid.NewString(),
		HUID:          childHU.ID,
		EventType:     domain.EventHUCreated,
		QuantityDelta: input.SplitQty,
		ActorUserID:   input.ActorUserID,
		Metadata:      map[string]any{"origin_hu_id": input.SourceHU.ID, "origin_hu_code": input.SourceHU.Code},
		BeforeState:   map[string]any{},
		AfterState: map[string]any{
			"id":            childHU.ID,
			"code":          childHU.Code,
			"quantity":      childHU.Quantity,
			"status":        childHU.Status,
			"location_code": childHU.LocationCode,
		},
	}); err != nil {
		return SplitResult{}, err
	}

	return SplitResult{
		ParentHU: parentAfter,
		ChildHU:  childHU,
	}, nil
}
