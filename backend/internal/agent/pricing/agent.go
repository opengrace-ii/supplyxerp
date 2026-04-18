package pricing

import (
	"context"
	"fmt"
	"time"

	"supplyxerp/backend/internal/db/dbgen"
	"supplyxerp/backend/internal/events"
	"supplyxerp/backend/internal/repository"
	"github.com/jackc/pgx/v5/pgtype"
)

type Agent struct {
	Hub *events.Hub
}

func New(hub *events.Hub) *Agent {
	return &Agent{Hub: hub}
}

type PricingContext struct {
	TenantID     int64
	SupplierID   *int64
	ProductID    *int64
	SiteID       *int64
	ValidOn      time.Time
	BaseQuantity float64
}

type CalculationResult struct {
	GrossPrice float64
	NetPrice   float64
	Steps      []StepResult
}

type StepResult struct {
	StepNumber   int32
	Condition    string
	Value        float64
	IsPercentage bool
	Calculated   float64
}

// CalculatePrice executes a pricing procedure based on the schema Code
func (a *Agent) CalculatePrice(ctx context.Context, repo *repository.UnitOfWork, schemaCode string, pCtx PricingContext) (CalculationResult, error) {
	q := dbgen.New(repo.Zones.GetDb()) // Use DB wrapper

	schema, err := q.GetCalculationSchema(ctx, dbgen.GetCalculationSchemaParams{
		TenantID: pCtx.TenantID,
		Code:     schemaCode,
	})
	if err != nil {
		return CalculationResult{}, fmt.Errorf("schema not found: %w", err)
	}

	steps, err := q.GetCalculationSchemaSteps(ctx, dbgen.GetCalculationSchemaStepsParams{
		TenantID: pCtx.TenantID,
		SchemaID: schema.ID,
	})
	if err != nil {
		return CalculationResult{}, fmt.Errorf("failed to load schema steps: %w", err)
	}

	result := CalculationResult{}
	subtotals := make(map[int32]float64)

	for _, step := range steps {
		stepVal := 0.0
		var conditionCode string

		if step.ConditionTypeCode.Valid {
			conditionCode = step.ConditionTypeCode.String
			// Resolve condition value
			var sID, pID, bID int64
			if pCtx.SupplierID != nil { sID = *pCtx.SupplierID }
			if pCtx.ProductID != nil { pID = *pCtx.ProductID }
			if pCtx.SiteID != nil { bID = *pCtx.SiteID }

			suppID := pgtype.Int8{Int64: sID, Valid: pCtx.SupplierID != nil}
			prodID := pgtype.Int8{Int64: pID, Valid: pCtx.ProductID != nil}
			siteID := pgtype.Int8{Int64: bID, Valid: pCtx.SiteID != nil}

			rec, err := q.GetValidConditionRecord(ctx, dbgen.GetValidConditionRecordParams{
				TenantID:          pCtx.TenantID,
				ConditionTypeID:   step.ConditionTypeID.Int64,
				ValidFrom:         pgtype.Timestamptz{Time: pCtx.ValidOn, Valid: true},
				SupplierID:        suppID,
				ProductID:         prodID,
				SiteID:            siteID,
			})

			if err == nil {
				val, _ := rec.RateAmount.Float64Value()
				stepVal = val.Float64
				
				calc := 0.0
				isPct := step.CalculationType.String == "PERCENTAGE"

				if isPct {
					var baseForPct float64
					if step.BaseStep.Valid {
						baseForPct = subtotals[step.BaseStep.Int32]
					} else {
						baseForPct = result.NetPrice // Simplified default
					}
					calc = baseForPct * (stepVal / 100.0)
				} else {
					calc = stepVal
					if step.CalculationType.String == "QUANTITY" {
						calc = stepVal * pCtx.BaseQuantity
					}
				}

				// Apply Class logic
				if step.ConditionClass.String == "DISCOUNTS" {
					calc = -calc
				}

				if !step.IsStatistical {
					result.NetPrice += calc
					subtotals[step.StepNumber] = result.NetPrice
				} else {
					subtotals[step.StepNumber] = calc
				}

				result.Steps = append(result.Steps, StepResult{
					StepNumber:   step.StepNumber,
					Condition:    conditionCode,
					Value:        stepVal,
					IsPercentage: isPct,
					Calculated:   calc,
				})
				
				if conditionCode == "PB00" || step.StepNumber == 10 {
					result.GrossPrice = calc
				}
			} else if step.IsRequired {
				return result, fmt.Errorf("mandatory condition %s not found", conditionCode)
			}
		} else {
			// Subtotal logic or statistical sum
			// Simple fallback since we removed from_to
			subtotals[step.StepNumber] = result.NetPrice
		}
	}

	a.broadcast(ctx, "PricingAgent", "CALCULATE_PRICE", "SUCCESS")
	return result, nil
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
