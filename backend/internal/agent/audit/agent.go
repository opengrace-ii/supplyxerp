package audit

import (
	"context"

	"erplite/backend/internal/domain"
	"erplite/backend/internal/repository"
	"github.com/google/uuid"
)

type Agent struct{}

func New() *Agent {
	return &Agent{}
}

func (a *Agent) LogAction(
	ctx context.Context,
	uow *repository.UnitOfWork,
	action string,
	actorUserID string,
	entityType string,
	entityID string,
	before map[string]any,
	after map[string]any,
	metadata map[string]any,
) error {
	entry := domain.AuditLog{
		ID:          uuid.NewString(),
		Action:      action,
		ActorUserID: actorUserID,
		EntityType:  entityType,
		EntityID:    entityID,
		BeforeState: before,
		AfterState:  after,
		Metadata:    metadata,
	}
	return uow.Audit.Log(ctx, entry)
}
