package repository

import (
	"context"
	"fmt"
	"strings"
	"time"
	"supplyxerp/backend/internal/db/dbgen"
	"github.com/jackc/pgx/v5/pgtype"
)

type PurchasingRepository struct {
	db DBTX
}

func (r *PurchasingRepository) GeneratePRNumber(ctx context.Context, tenantID int64) (string, error) {
	var format string
	err := r.db.QueryRow(ctx, "SELECT pr_number_format FROM tenant_config WHERE tenant_id = $1", tenantID).Scan(&format)
	if err != nil {
		format = "PR-{YEAR}-{SEQ}"
	}

	var seq int64
	err = r.db.QueryRow(ctx, "SELECT get_next_sequence($1, 'PR')", tenantID).Scan(&seq)
	if err != nil {
		return "", err
	}

	yearStr := time.Now().Format("2006")
	seqStr := fmt.Sprintf("%05d", seq)
	
	res := strings.ReplaceAll(format, "{YEAR}", yearStr)
	res = strings.ReplaceAll(res, "{SEQ}", seqStr)
	return res, nil
}

func (r *PurchasingRepository) GeneratePONumber(ctx context.Context, tenantID int64) (string, error) {
	var format string
	err := r.db.QueryRow(ctx, "SELECT po_number_format FROM tenant_config WHERE tenant_id = $1", tenantID).Scan(&format)
	if err != nil {
		format = "PO-{YEAR}-{SEQ}"
	}

	var seq int64
	err = r.db.QueryRow(ctx, "SELECT get_next_sequence($1, 'PO')", tenantID).Scan(&seq)
	if err != nil {
		return "", err
	}

	yearStr := time.Now().Format("2006")
	seqStr := fmt.Sprintf("%05d", seq)
	
	res := strings.ReplaceAll(format, "{YEAR}", yearStr)
	res = strings.ReplaceAll(res, "{SEQ}", seqStr)
	return res, nil
}

func (r *PurchasingRepository) GenerateRFQNumber(ctx context.Context, tenantID int64) (string, error) {
	var seq int64
	err := r.db.QueryRow(ctx, "SELECT get_next_sequence($1, 'rfq')", tenantID).Scan(&seq)
	if err != nil {
		return "", err
	}

	yearStr := time.Now().Format("2006")
	seqStr := fmt.Sprintf("%04d", seq)
	
	return fmt.Sprintf("RFQ-%s-%s", yearStr, seqStr), nil
}

func (r *PurchasingRepository) CreatePR(ctx context.Context, arg dbgen.PurchaseRequest) (dbgen.PurchaseRequest, error) {
	q := dbgen.New(r.db)
	return q.CreatePurchaseRequest(ctx, dbgen.CreatePurchaseRequestParams{
		TenantID:        arg.TenantID,
		PrNumber:        arg.PrNumber,
		RequiredByDate:  arg.RequiredByDate,
		Notes:           arg.Notes,
		CreatedBy:       arg.CreatedBy,
		PurchasingGroup: arg.PurchasingGroup,
		CostCentre:      arg.CostCentre,
		Priority:        arg.Priority,
		ReferenceDoc:    arg.ReferenceDoc,
		DecisionFactor:  arg.DecisionFactor,
		PricingBreakdown: arg.PricingBreakdown,
	})
}

func (r *PurchasingRepository) AddPRLine(ctx context.Context, arg dbgen.PurchaseRequestLine) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO purchase_request_lines (
			tenant_id, pr_id, line_number, product_id, quantity, unit,
			short_text, required_by_date, estimated_unit_price, currency,
			line_value, preferred_supplier_id, account_assignment_type,
			cost_centre, line_notes, line_status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		)
	`, arg.TenantID, arg.PrID, arg.LineNumber, arg.ProductID, arg.Quantity, arg.Unit,
		arg.ShortText, arg.RequiredByDate, arg.EstimatedUnitPrice, arg.Currency,
		arg.LineValue, arg.PreferredSupplierID, arg.AccountAssignmentType,
		arg.CostCentre, arg.LineNotes, arg.LineStatus,
	)
	return err
}

func (r *PurchasingRepository) ListPRs(ctx context.Context, tenantID int64, status string) ([]dbgen.PurchaseRequest, error) {
	q := dbgen.New(r.db)
	return q.ListPurchaseRequests(ctx, dbgen.ListPurchaseRequestsParams{
		TenantID: tenantID,
		Column2:  status,
	})
}

func (r *PurchasingRepository) GetPRDetail(ctx context.Context, tenantID, prID int64) ([]dbgen.GetPurchaseRequestWithLinesRow, error) {
	q := dbgen.New(r.db)
	return q.GetPurchaseRequestWithLines(ctx, dbgen.GetPurchaseRequestWithLinesParams{
		TenantID: tenantID,
		ID:       prID,
	})
}

func (r *PurchasingRepository) UpdatePRStatus(ctx context.Context, tenantID, prID int64, status string, approvedBy int64) error {
	q := dbgen.New(r.db)
	return q.UpdatePurchaseRequestStatus(ctx, dbgen.UpdatePurchaseRequestStatusParams{
		TenantID:   tenantID,
		ID:         prID,
		Status:     status,
		ApprovedBy: pgtype.Int8{Int64: approvedBy, Valid: approvedBy != 0},
	})
}

func (r *PurchasingRepository) CreatePO(ctx context.Context, arg dbgen.PurchaseOrder) (dbgen.PurchaseOrder, error) {
	q := dbgen.New(r.db)
	return q.CreatePurchaseOrder(ctx, dbgen.CreatePurchaseOrderParams{
		TenantID:             arg.TenantID,
		PoNumber:             arg.PoNumber,
		SupplierID:           arg.SupplierID,
		PrID:                 arg.PrID,
		Status:               arg.Status,
		Currency:             arg.Currency,
		TotalValue:           arg.TotalValue,
		ExpectedDeliveryDate: arg.ExpectedDeliveryDate,
		Notes:                arg.Notes,
		CreatedBy:            arg.CreatedBy,
		ApprovedBy:           arg.ApprovedBy,
		ApprovedAt:           arg.ApprovedAt,
		PurchasingOrg:        arg.PurchasingOrg,
		PurchasingGroup:      arg.PurchasingGroup,
		CompanyCode:          arg.CompanyCode,
		ExchangeRate:         arg.ExchangeRate,
		PaymentTermsDays:     arg.PaymentTermsDays,
		Incoterms:            arg.Incoterms,
		IncotermsLocation:    arg.IncotermsLocation,
		GoodsReceiptExpected: arg.GoodsReceiptExpected,
		InvoiceExpected:      arg.InvoiceExpected,
		TotalNetValue:        arg.TotalNetValue,
		TotalTax:             arg.TotalTax,
		TotalGrossValue:      arg.TotalGrossValue,
		RfqID:                arg.RfqID,
		SupplierRef:          arg.SupplierRef,
		DeliveryAddress:      arg.DeliveryAddress,
		DecisionFactor:       arg.DecisionFactor,
		PricingBreakdown:     arg.PricingBreakdown,
	})
}

func (r *PurchasingRepository) AddPOLine(ctx context.Context, arg dbgen.PurchaseOrderLine) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO purchase_order_lines (
			tenant_id, po_id, line_number, item_no, product_id, short_text,
			quantity, unit, currency, unit_price, line_net_value,
			tax_code, tax_amount, line_gross_value, delivery_date,
			receiving_zone_id, overdelivery_tolerance_pct,
			underdelivery_tolerance_pct, price_locked,
			account_assignment_type, cost_centre, line_notes, line_status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
		)
	`, arg.TenantID, arg.PoID, arg.LineNumber, arg.ItemNo, arg.ProductID, arg.ShortText,
		arg.Quantity, arg.Unit, arg.Currency, arg.UnitPrice, arg.LineNetValue,
		arg.TaxCode, arg.TaxAmount, arg.LineGrossValue, arg.DeliveryDate,
		arg.ReceivingZoneID, arg.OverdeliveryTolerancePct,
		arg.UnderdeliveryTolerancePct, arg.PriceLocked,
		arg.AccountAssignmentType, arg.CostCentre, arg.LineNotes, arg.LineStatus,
	)
	return err
}

func (r *PurchasingRepository) ListPOs(ctx context.Context, tenantID int64, status string) ([]dbgen.ListPurchaseOrdersRow, error) {
	q := dbgen.New(r.db)
	return q.ListPurchaseOrders(ctx, dbgen.ListPurchaseOrdersParams{
		TenantID: tenantID,
		Column2:  status,
	})
}

func (r *PurchasingRepository) GetPODetail(ctx context.Context, tenantID, poID int64) ([]dbgen.GetPurchaseOrderWithLinesRow, error) {
	q := dbgen.New(r.db)
	return q.GetPurchaseOrderWithLines(ctx, dbgen.GetPurchaseOrderWithLinesParams{
		TenantID: tenantID,
		ID:       poID,
	})
}

func (r *PurchasingRepository) UpdatePOStatus(ctx context.Context, tenantID, poID int64, status string) error {
	q := dbgen.New(r.db)
	return q.UpdatePurchaseOrderStatus(ctx, dbgen.UpdatePurchaseOrderStatusParams{
		TenantID: tenantID,
		ID:       poID,
		Status:   status,
	})
}

func (r *PurchasingRepository) UpdatePOLineReceived(ctx context.Context, tenantID, lineID int64, qty float64) error {
	q := dbgen.New(r.db)
	return q.UpdatePurchaseOrderLineReceived(ctx, dbgen.UpdatePurchaseOrderLineReceivedParams{
		TenantID:    tenantID,
		ID:          lineID,
		QtyReceived: NumericFromFloat(qty),
	})
}

func (r *PurchasingRepository) GetApprovalThresholds(ctx context.Context, tenantID int64) (dbgen.GetApprovalThresholdsRow, error) {
	q := dbgen.New(r.db)
	return q.GetApprovalThresholds(ctx, tenantID)
}
