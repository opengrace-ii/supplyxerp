package labeling

import (
	"context"

	"erplite/backend/internal/domain"
	"erplite/backend/internal/repository"
	"erplite/backend/internal/utils"
	"github.com/google/uuid"
)

type Agent struct{}

type RelabelInput struct {
	HU          domain.HU
	NewBarcode  string
	ActorUserID string
}

func New() *Agent {
	return &Agent{}
}

func (a *Agent) VerifyIdentity(ctx context.Context, uow *repository.UnitOfWork, barcode, huID string) error {
	entityType, entityID, err := uow.Barcodes.Resolve(ctx, barcode)
	if err != nil {
		return err
	}
	if entityType != "HU" || entityID != huID {
		return utils.NewAppError(409, "LABEL_IDENTITY_MISMATCH", "barcode identity does not match resolved HU")
	}
	return nil
}

func (a *Agent) Relabel(ctx context.Context, uow *repository.UnitOfWork, input RelabelInput) error {
	if input.NewBarcode == "" {
		return utils.NewAppError(400, "INVALID_BARCODE", "new barcode is required")
	}

	if err := uow.Barcodes.DeactivateForEntity(ctx, "HU", input.HU.ID); err != nil {
		return err
	}
	if err := uow.Barcodes.Bind(ctx, input.NewBarcode, "HU", input.HU.ID); err != nil {
		return err
	}

	return uow.Events.AppendHUEvent(ctx, domain.HUEvent{
		ID:            uuid.NewString(),
		HUID:          input.HU.ID,
		EventType:     domain.EventHURelabeled,
		QuantityDelta: 0,
		ActorUserID:   input.ActorUserID,
		Metadata: map[string]any{
			"new_barcode": input.NewBarcode,
		},
		BeforeState: map[string]any{
			"code": input.HU.Code,
		},
		AfterState: map[string]any{
			"code": input.HU.Code,
		},
	})
}
