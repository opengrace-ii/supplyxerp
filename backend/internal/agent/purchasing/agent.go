package purchasing

import (
	"context"
	"fmt"
	"time"
	"math/big"

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

type CreatePRParams struct {
	TenantID        int64
	ActorID         int64
	DocumentDate    time.Time
	PostingDate     time.Time
	PurchasingGroup string
	CostCentre      string
	Priority        string
	ReferenceDoc    string
	Notes           string
	Lines           []struct {
		ProductID             int64
		Quantity              float64
		Unit                  string
		EstimatedUnitPrice    float64
		ShortText             string
		RequiredByDate        time.Time
		PreferredSupplierID   int64
		AccountAssignmentType string
		CostCentre            string
		LineNotes             string
	}
}

func (a *Agent) CreatePR(ctx context.Context, repo *repository.UnitOfWork, p CreatePRParams) (dbgen.PurchaseRequest, error) {
	// 1. Generate PR Number
	prNumber, err := repo.Purchasing.GeneratePRNumber(ctx, p.TenantID)
	if err != nil {
		return dbgen.PurchaseRequest{}, fmt.Errorf("generate pr number: %w", err)
	}

	// 1.5 Calculate Total Value for PR
	totalValue := 0.0
	for _, l := range p.Lines {
		totalValue += l.Quantity * l.EstimatedUnitPrice
	}

	// 1.6 Determine Initial Status via Threshold Check
	status := "APPROVED"
	decisionFactor := "Value below approval threshold"
	thresholdRow, err := repo.Purchasing.GetApprovalThresholds(ctx, p.TenantID)
	if err == nil {
		if thresholdRow.ApprovalMode == "FLAT" {
			threshold, _ := thresholdRow.FlatPrThreshold.Float64Value()
			if totalValue >= threshold.Float64 {
				status = "SUBMITTED"
				decisionFactor = fmt.Sprintf("Value %0.2f exceeds flat threshold %0.2f", totalValue, threshold.Float64)
			}
		} else {
			status = "SUBMITTED"
			decisionFactor = "MRP-based approval required"
		}
	}

	// 2. Create PR and lines in Transaction
	pr, err := repo.Purchasing.CreatePR(ctx, dbgen.PurchaseRequest{
		TenantID:        p.TenantID,
		PrNumber:        prNumber,
		Status:          status,
		DocumentDate:    pgtype.Date{Time: p.DocumentDate, Valid: !p.DocumentDate.IsZero()},
		PostingDate:     pgtype.Date{Time: p.PostingDate, Valid: !p.PostingDate.IsZero()},
		PurchasingGroup: pgtype.Text{String: p.PurchasingGroup, Valid: p.PurchasingGroup != ""},
		CostCentre:      pgtype.Text{String: p.CostCentre, Valid: p.CostCentre != ""},
		Priority:        p.Priority,
		ReferenceDoc:    pgtype.Text{String: p.ReferenceDoc, Valid: p.ReferenceDoc != ""},
		Notes:           pgtype.Text{String: p.Notes, Valid: p.Notes != ""},
		CreatedBy:       pgtype.Int8{Int64: p.ActorID, Valid: true},
		DecisionFactor:  pgtype.Text{String: decisionFactor, Valid: true},
	})
	if err != nil {
		return dbgen.PurchaseRequest{}, err
	}

	for i, line := range p.Lines {
		lineNumber := int32((i + 1) * 10)
		lineVal := line.Quantity * line.EstimatedUnitPrice
		
		err = repo.Purchasing.AddPRLine(ctx, dbgen.PurchaseRequestLine{
			TenantID:              p.TenantID,
			PrID:                  pr.ID,
			LineNumber:            lineNumber,
			ProductID:             line.ProductID,
			ShortText:             pgtype.Text{String: line.ShortText, Valid: line.ShortText != ""},
			Quantity:              numericFromFloat(line.Quantity),
			Unit:                  line.Unit,
			RequiredByDate:        pgtype.Date{Time: line.RequiredByDate, Valid: !line.RequiredByDate.IsZero()},
			EstimatedUnitPrice:    numericFromFloat(line.EstimatedUnitPrice),
			Currency:              pgtype.Text{String: "GBP", Valid: true}, // Default for now or from tenant
			LineValue:             numericFromFloat(lineVal),
			PreferredSupplierID:   pgtype.Int8{Int64: line.PreferredSupplierID, Valid: line.PreferredSupplierID != 0},
			AccountAssignmentType: pgtype.Text{String: line.AccountAssignmentType, Valid: line.AccountAssignmentType != ""},
			CostCentre:            pgtype.Text{String: line.CostCentre, Valid: line.CostCentre != ""},
			LineNotes:             pgtype.Text{String: line.LineNotes, Valid: line.LineNotes != ""},
			LineStatus:            "OPEN",
		})
		if err != nil {
			return dbgen.PurchaseRequest{}, err
		}
	}

	// 3. Log Event (Trace)
	a.broadcast(ctx, "AuditAgent", "LOGGING_PR_CREATED", "SUCCESS")

	return pr, nil
}

type CreatePOParams struct {
	TenantID         int64
	ActorID          int64
	SupplierID       int64
	PRID             int64
	DocumentType     string
	DocumentDate     time.Time
	PostingDate      time.Time
	PurchasingOrg    string
	PurchasingGroup  string
	CompanyCode      string
	Currency         string
	ExchangeRate     float64
	PaymentTermsDays int
	Incoterms        string
	IncotermsLocation string
	SupplierRef      string
	DeliveryAddress  string
	Notes            string
	Lines            []struct {
		ProductID                 int64
		Quantity                  float64
		Unit                      string
		UnitPrice                 float64
		ShortText                 string
		TaxCode                   string
		DeliveryDate              time.Time
		ReceivingZoneID           int64
		OverdeliveryTolerancePct  float64
		UnderdeliveryTolerancePct float64
		AccountAssignmentType     string
		CostCentre                string
		LineNotes                 string
	}
}

func (a *Agent) CreatePO(ctx context.Context, repo *repository.UnitOfWork, p CreatePOParams) (dbgen.PurchaseOrder, error) {
	// 1. Generate PO Number
	poNumber, err := repo.Purchasing.GeneratePONumber(ctx, p.TenantID)
	if err != nil {
		return dbgen.PurchaseOrder{}, fmt.Errorf("generate po number: %w", err)
	}

	// 2. Calculate Total Value
	totalValue := 0.0
	for _, l := range p.Lines {
		totalValue += l.Quantity * l.UnitPrice
	}

	// 3. Determine Initial Status via Threshold Check
	status := "APPROVED"
	decisionFactor := "Value below approval threshold"
	thresholdRow, err := repo.Purchasing.GetApprovalThresholds(ctx, p.TenantID)
	if err == nil {
		if thresholdRow.ApprovalMode == "FLAT" {
			threshold, _ := thresholdRow.FlatPoThreshold.Float64Value()
			if totalValue >= threshold.Float64 {
				status = "SUBMITTED"
				decisionFactor = fmt.Sprintf("Value %0.2f exceeds flat threshold %0.2f", totalValue, threshold.Float64)
			}
		} else {
			status = "SUBMITTED"
			decisionFactor = "MRP-based approval required"
		}
	}

	// 3.1 Fetch Supplier for Snapshot
	var supplierName string
	// Using uow.Zones.GetDb() as a way to get a db connection if repository doesn't expose it directly.
	_ = repo.Zones.GetDb().QueryRow(ctx, "SELECT name FROM suppliers WHERE id = $1", p.SupplierID).Scan(&supplierName)

	// 4. Create PO
	po, err := repo.Purchasing.CreatePO(ctx, dbgen.PurchaseOrder{
		TenantID:             p.TenantID,
		PoNumber:             poNumber,
		SupplierID:           p.SupplierID,
		PrID:                 pgtype.Int8{Int64: p.PRID, Valid: p.PRID != 0},
		Status:               status,
		DocumentType:         p.DocumentType,
		DocumentDate:         pgtype.Date{Time: p.DocumentDate, Valid: !p.DocumentDate.IsZero()},
		PostingDate:          pgtype.Date{Time: p.PostingDate, Valid: !p.PostingDate.IsZero()},
		SupplierNameSnapshot: pgtype.Text{String: supplierName, Valid: true},
		PurchasingOrg:        pgtype.Text{String: p.PurchasingOrg, Valid: p.PurchasingOrg != ""},
		PurchasingGroup:      pgtype.Text{String: p.PurchasingGroup, Valid: p.PurchasingGroup != ""},
		CompanyCode:          pgtype.Text{String: p.CompanyCode, Valid: p.CompanyCode != ""},
		Currency:             p.Currency,
		ExchangeRate:         numericFromFloat(p.ExchangeRate),
		PaymentTermsDays:     pgtype.Int4{Int32: int32(p.PaymentTermsDays), Valid: true},
		Incoterms:            pgtype.Text{String: p.Incoterms, Valid: p.Incoterms != ""},
		IncotermsLocation:    pgtype.Text{String: p.IncotermsLocation, Valid: p.IncotermsLocation != ""},
		GoodsReceiptExpected: true,
		InvoiceExpected:      true,
		TotalNetValue:        numericFromFloat(totalValue),
		Notes:                pgtype.Text{String: p.Notes, Valid: p.Notes != ""},
		CreatedBy:            pgtype.Int8{Int64: p.ActorID, Valid: true},
		ApprovedBy:           pgtype.Int8{Int64: p.ActorID, Valid: status == "APPROVED"},
		ApprovedAt:           pgtype.Timestamptz{Time: time.Now(), Valid: status == "APPROVED"},
		SupplierRef:          pgtype.Text{String: p.SupplierRef, Valid: p.SupplierRef != ""},
		DeliveryAddress:      pgtype.Text{String: p.DeliveryAddress, Valid: p.DeliveryAddress != ""},
		DecisionFactor:       pgtype.Text{String: decisionFactor, Valid: true},
	})
	if err != nil {
		return dbgen.PurchaseOrder{}, err
	}

	// 5. Create Lines
	for i, l := range p.Lines {
		lineNumber := int32((i + 1) * 10)
		lineNetVal := l.Quantity * l.UnitPrice

		err = repo.Purchasing.AddPOLine(ctx, dbgen.PurchaseOrderLine{
			TenantID:              p.TenantID,
			PoID:                  po.ID,
			LineNumber:            lineNumber,
			ProductID:             l.ProductID,
			ShortText:             pgtype.Text{String: l.ShortText, Valid: l.ShortText != ""},
			Quantity:              numericFromFloat(l.Quantity),
			Unit:                  l.Unit,
			Currency:              pgtype.Text{String: p.Currency, Valid: p.Currency != ""},
			UnitPrice:             numericFromFloat(l.UnitPrice),
			LineNetValue:          numericFromFloat(lineNetVal),
			DeliveryDate:          pgtype.Date{Time: l.DeliveryDate, Valid: !l.DeliveryDate.IsZero()},
			ReceivingZoneID:       pgtype.Int8{Int64: l.ReceivingZoneID, Valid: l.ReceivingZoneID != 0},
			OverdeliveryTolerancePct: numericFromFloat(l.OverdeliveryTolerancePct),
			UnderdeliveryTolerancePct: numericFromFloat(l.UnderdeliveryTolerancePct),
			AccountAssignmentType: pgtype.Text{String: l.AccountAssignmentType, Valid: l.AccountAssignmentType != ""},
			CostCentre:            pgtype.Text{String: l.CostCentre, Valid: l.CostCentre != ""},
			LineNotes:             pgtype.Text{String: l.LineNotes, Valid: l.LineNotes != ""},
			LineStatus:            "OPEN",
		})
		if err != nil {
			return dbgen.PurchaseOrder{}, err
		}
	}

	// 6. If PR conversion, update PR status
	if p.PRID != 0 {
		repo.Purchasing.UpdatePRStatus(ctx, p.TenantID, p.PRID, "CONVERTED", p.ActorID)
	}

	// Log Event (Trace)
	a.broadcast(ctx, "AuditAgent", "LOGGING_PO_CREATED", "SUCCESS")

	return po, nil
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

// Helpers duplicated from repository/util.go because agent shouldn't import internal/repository/util (circular possible)
// or move them to a common package. For now, duplication is safer for local speed.
func numericFromFloat(f float64) pgtype.Numeric {
	return pgtype.Numeric{
		Int:   bigInt(int64(f * 10000)),
		Exp:   -4,
		Valid: true,
	}
}
func bigInt(i int64) *big.Int {
	return new(big.Int).SetInt64(i)
}
