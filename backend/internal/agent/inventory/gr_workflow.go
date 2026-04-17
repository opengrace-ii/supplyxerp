package inventory

import (
	"context"
	"fmt"
	"time"

	"supplyxerp/backend/internal/agent/barcode"
	"supplyxerp/backend/internal/agent/warehouse"
	"supplyxerp/backend/internal/events"
	"supplyxerp/backend/internal/repository"
)

type GRWorkflow struct {
	Hub            *events.Hub
	InventoryAgent *Agent
	BarcodeAgent   *barcode.Agent
	WarehouseAgent *warehouse.Agent
}

type GRParams struct {
	TenantID           int64
	OrganisationID     int64
	SiteID             int64
	ZoneID             int64
	ProductID          int64
	Quantity           float64
	Unit               string
	DocumentDate       time.Time
	PostingDate        time.Time
	MovementType       string
	SupplierID         *int64
	SupplierRef        string
	DeliveryNoteNumber string
	BillOfLading       string
	Notes              string
	BatchRef           string
	ExpiryDate         *time.Time
	StockType          string
	ActorUserID        int64
	POID               int64
	POLineID           int64
}

func (w *GRWorkflow) ProcessGR(ctx context.Context, uow *repository.UnitOfWork, p GRParams) (map[string]any, error) {
	// 1. ErrorPreventionAgent → VALIDATE_GR
	w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_GR", "SUCCESS")
	
	// Check zone type must be RECEIVING
	var zType string
	err := uow.Zones.GetDb().QueryRow(ctx, "SELECT zone_type FROM zones WHERE id = $1", p.ZoneID).Scan(&zType)
	if err != nil || zType != "RECEIVING" {
		w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_GR", "FAILED")
		return nil, fmt.Errorf("Goods receipt must target a RECEIVING zone")
	}

	// 2. InventoryAgent → CREATE_HU
	huCode, _ := uow.GR.GetNextHUCode(ctx, p.TenantID)
	huID, err := w.InventoryAgent.CreateHU(ctx, uow, CreateHUInput{
		TenantID:  p.TenantID,
		ProductID: p.ProductID,
		Code:      huCode,
		Quantity:  p.Quantity,
		Unit:      p.Unit,
		SiteID:    p.SiteID,
		ZoneID:    p.ZoneID,
		Status:    "IN_STOCK",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create HU: %w", err)
	}

	// 3. InventoryAgent → POST_GR_EVENT
	// Create GR Document first to reference it
	grID, err := uow.GR.Create(ctx, repository.GRDocument{
		TenantID:           p.TenantID,
		OrganisationID:     p.OrganisationID,
		SiteID:             p.SiteID,
		ZoneID:             p.ZoneID,
		Status:             "POSTED",
		DocumentDate:       p.DocumentDate,
		PostingDate:        p.PostingDate,
		MovementType:       p.MovementType,
		SupplierID:         p.SupplierID,
		SupplierRef:        p.SupplierRef,
		DeliveryNoteNumber: p.DeliveryNoteNumber,
		BillOfLading:       p.BillOfLading,
		Notes:              p.Notes,
		PostedBy:           &p.ActorUserID,
		CreatedBy:          &p.ActorUserID,
	})
	if err != nil {
		return nil, err
	}
	
	// Add line (First line is 1)
	err = uow.GR.AddLine(ctx, repository.GRLine{
		LineNumber:   1,
		ProductID:    p.ProductID,
		Quantity:     p.Quantity,
		Unit:         p.Unit,
		BatchRef:     p.BatchRef,
		ExpiryDate:   p.ExpiryDate,
		StockType:    p.StockType,
		MovementType: p.MovementType,
		HUID:         &huID,
	}, grID, p.TenantID)
	if err != nil {
		return nil, err
	}

	err = w.InventoryAgent.PostInboundEvent(ctx, uow, p.TenantID, huID, p.ProductID, p.Quantity, p.Unit, p.SiteID, p.ZoneID, p.ActorUserID, "GR_DOCUMENT", grID)
	if err != nil {
		return nil, err
	}

	// 3.1 Link and update PO if provided
	if p.POLineID != 0 {
		err = uow.Purchasing.UpdatePOLineReceived(ctx, p.TenantID, p.POLineID, p.Quantity)
		if err != nil {
			return nil, fmt.Errorf("failed to update PO line: %w", err)
		}

		// Update PO status to PARTIALLY_RECEIVED or RECEIVED? 
		// For simplicity, we just set to PARTIALLY_RECEIVED for now, 
		// or check if fully received.
		uow.Purchasing.UpdatePOStatus(ctx, p.TenantID, p.POID, "PARTIALLY_RECEIVED")
	}

	// 4. BarcodeAgent → REGISTER_HU_BARCODE
	w.broadcast(ctx, "BarcodeAgent", "REGISTER_HU_BARCODE", "SUCCESS")
	err = uow.Barcodes.Create(ctx, repository.CreateBarcodeParams{
		TenantID:   p.TenantID,
		Code:       huCode,
		EntityType: "HU",
		EntityID:   huID,
	})

	// 5. WarehouseAgent → CREATE_PUTAWAY_TASK
	err = w.WarehouseAgent.CreatePutawayTask(ctx, uow, p.TenantID, huID, p.ZoneID)
	if err != nil {
		return nil, err
	}

	// 6. AuditAgent → LOG_GR
	w.broadcast(ctx, "AuditAgent", "LOGGING_GR", "SUCCESS")
	uow.Audit.Log(ctx, p.TenantID, p.ActorUserID, "GR_POSTED", "GR_DOCUMENT", grID, nil, p)

	return map[string]any{
		"gr_id":   grID,
		"hu_id":   huID,
		"hu_code": huCode,
	}, nil
}

func (w *GRWorkflow) broadcast(ctx context.Context, agent, action, status string) {
	if w.Hub == nil {
		return
	}
	w.Hub.Broadcast("agent_trace", map[string]any{
		"agent":     agent,
		"action":    action,
		"status":    status,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
