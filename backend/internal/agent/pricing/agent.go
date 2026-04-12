package pricing

import (
	"context"
	"errors"
	"time"

	"erplite/backend/internal/domain"
	"erplite/backend/internal/repository"
	"erplite/backend/internal/utils"
	"github.com/jackc/pgx/v5"
)

type Agent struct{}

type SetPriceInput struct {
	MaterialCode string
	Currency     string
	Price        float64
	ValidFrom    time.Time
	ActorUserID  string
}

func New() *Agent {
	return &Agent{}
}

func (a *Agent) SetTimedPrice(ctx context.Context, uow *repository.UnitOfWork, input SetPriceInput) (domain.PriceRecord, error) {
	if input.MaterialCode == "" {
		return domain.PriceRecord{}, utils.NewAppError(400, "INVALID_MATERIAL", "material code is required")
	}
	if input.Currency == "" {
		return domain.PriceRecord{}, utils.NewAppError(400, "INVALID_CURRENCY", "currency is required")
	}
	if input.Price <= 0 {
		return domain.PriceRecord{}, utils.NewAppError(400, "INVALID_PRICE", "price must be greater than zero")
	}
	if input.ValidFrom.IsZero() {
		input.ValidFrom = time.Now().UTC()
	}
	return uow.Pricing.SetTimedPrice(ctx, input.MaterialCode, input.Currency, input.Price, input.ValidFrom, input.ActorUserID)
}

func (a *Agent) ResolvePriceAt(ctx context.Context, uow *repository.UnitOfWork, materialCode, currency string, at time.Time) (domain.PriceRecord, bool, error) {
	record, err := uow.Pricing.GetPriceAt(ctx, materialCode, currency, at)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.PriceRecord{}, false, nil
		}
		return domain.PriceRecord{}, false, err
	}
	return record, true, nil
}
