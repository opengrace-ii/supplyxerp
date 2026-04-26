// scorecard_engine.go
// Automated vendor scorecard calculation engine.
// Called after GR posting, quality checks, and invoice matching.
// Can also be triggered manually via API.

package handlers

import (
	"context"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"supplyxerp/backend/internal/db/dbgen"
)

// ScoreWeights defines how each dimension contributes to overall score.
// All weights must sum to 1.0
const (
	weightDelivery   = 0.40 // 40% — was order delivered on time?
	weightQuality    = 0.35 // 35% — did it pass quality inspection?
	weightCompliance = 0.25 // 25% — pact adherence, invoice accuracy
)

// CalculateVendorScore recalculates the vendor scorecard from raw events.
// Call this after: GR posted, QC result recorded, invoice matched/disputed.
func CalculateVendorScore(
	ctx context.Context,
	queries *dbgen.Queries,
	tenantID, supplierID int64,
) error {
	// Fetch all events for this supplier in the last 12 months
	since := time.Now().AddDate(-1, 0, 0)
	events, err := queries.GetScorecardEvents(ctx, dbgen.GetScorecardEventsParams{
		TenantID:   tenantID,
		SupplierID: supplierID,
		RecordedAt: pgtype.Timestamptz{Time: since, Valid: true},
	})
	if err != nil {
		return err
	}

	if len(events) == 0 {
		// No events yet — score stays at 100 (new supplier benefit of doubt)
		return nil
	}

	// Count events by type
	var (
		totalOrders    int
		onTimeCount    int
		lateCount      int
		earlyCount     int
		qualityPass    int
		qualityFail    int
		qualityPartial int
		pactCompliance int
		pactBreach     int
		invoiceCorrect int
		invoiceDispute int
	)

	for _, e := range events {
		switch e.EventType {
		case "ON_TIME_DELIVERY":
			totalOrders++
			onTimeCount++
		case "LATE_DELIVERY":
			totalOrders++
			lateCount++
		case "EARLY_DELIVERY":
			totalOrders++
			earlyCount++
		case "QUALITY_PASS":
			qualityPass++
		case "QUALITY_FAIL":
			qualityFail++
		case "QUALITY_PARTIAL":
			qualityPartial++
		case "PACT_COMPLIANCE":
			pactCompliance++
		case "PACT_BREACH":
			pactBreach++
		case "INVOICE_CORRECT":
			invoiceCorrect++
		case "INVOICE_DISPUTE":
			invoiceDispute++
		}
	}

	// ── Delivery Score (0–100) ──────────────────────────────────────────────
	// Perfect = all on time. Each late = -10. Deduct more for repeat offenders.
	deliveryScore := 100.0
	if totalOrders > 0 {
		onTimeRate := float64(onTimeCount+earlyCount) / float64(totalOrders)
		deliveryScore = onTimeRate * 100.0

		// Bonus for consistency: if >90% on time, add 5 points (capped at 100)
		if onTimeRate > 0.90 {
			deliveryScore = math.Min(100.0, deliveryScore+5.0)
		}
		// Penalty for repeat lateness: >30% late = additional -10
		lateRate := float64(lateCount) / float64(totalOrders)
		if lateRate > 0.30 {
			deliveryScore = math.Max(0.0, deliveryScore-10.0)
		}
	}

	// ── Quality Score (0–100) ───────────────────────────────────────────────
	qualityScore := 100.0
	totalQC := qualityPass + qualityFail + qualityPartial
	if totalQC > 0 {
		passRate := float64(qualityPass) / float64(totalQC)
		qualityScore = passRate * 100.0
		// Partial passes count as 50%
		if qualityPartial > 0 {
			partialRate := float64(qualityPartial) / float64(totalQC)
			qualityScore += partialRate * 50.0
		}
		qualityScore = math.Min(100.0, qualityScore)
	}

	// ── Compliance Score (0–100) ────────────────────────────────────────────
	complianceScore := 100.0
	totalCompliance := pactCompliance + pactBreach + invoiceCorrect + invoiceDispute
	if totalCompliance > 0 {
		complianceRate := float64(pactCompliance+invoiceCorrect) /
			float64(totalCompliance)
		complianceScore = complianceRate * 100.0
		// Hard penalty: each pact breach = -15 points
		complianceScore = math.Max(0.0,
			complianceScore-float64(pactBreach)*15.0)
	}

	// ── Overall Score (weighted average) ────────────────────────────────────
	autoScore := (deliveryScore * weightDelivery) +
		(qualityScore * weightQuality) +
		(complianceScore * weightCompliance)
	autoScore = math.Round(autoScore*100) / 100 // round to 2dp

	// ── Persist ─────────────────────────────────────────────────────────────
	return queries.UpdateVendorScorecardCalculated(ctx,
		dbgen.UpdateVendorScorecardCalculatedParams{
			TenantID:        pgtype.Int8{Int64: tenantID, Valid: true},
			SupplierID:      supplierID,
			AutoScore:       numericFromFloat(autoScore),
			DeliveryScore:   numericFromFloat(deliveryScore),
			QualityScore:    numericFromFloat(qualityScore),
			ComplianceScore: numericFromFloat(complianceScore),
			TotalOrders:     pgtype.Int4{Int32: int32(totalOrders), Valid: true},
			OnTimeCount:     pgtype.Int4{Int32: int32(onTimeCount), Valid: true},
			LateCount:       pgtype.Int4{Int32: int32(lateCount), Valid: true},
			QualityPass:     pgtype.Int4{Int32: int32(qualityPass), Valid: true},
			QualityFail:     pgtype.Int4{Int32: int32(qualityFail), Valid: true},
			LastCalculated:  pgtype.Timestamptz{Time: time.Now(), Valid: true},
		})
}
