package inventory

import (
	"context"
	"fmt"
	"strings"
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
	Status             string
	// Roll / serial tracking (optional)
	RollCount  *int    // if set > 1, creates N HUs (one per roll)
	RollPrefix *string // prefix for serial numbers e.g. "200-60" → "200-60-001"
}

func (w *GRWorkflow) ProcessGR(ctx context.Context, uow *repository.UnitOfWork, p GRParams) (map[string]any, error) {
	// 1. Validate zone
	w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_GR", "SUCCESS")
	var zType string
	err := uow.Zones.GetDb().QueryRow(ctx, "SELECT zone_type FROM zones WHERE id = $1", p.ZoneID).Scan(&zType)
	if err != nil || zType != "RECEIVING" {
		w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_GR", "FAILED")
		return nil, fmt.Errorf("Goods receipt must target a RECEIVING zone")
	}

	// 2. Resolve final stock type from QC policy
	var qcOnGR bool
	var defaultStockType string
	_ = uow.Zones.GetDb().QueryRow(ctx, "SELECT qc_on_gr, gr_default_stock_type FROM products WHERE id = $1", p.ProductID).Scan(&qcOnGR, &defaultStockType)

	finalStockType := p.StockType
	if qcOnGR {
		finalStockType = "QI_INSPECTION"
	} else if defaultStockType != "" && finalStockType == "UNRESTRICTED" {
		finalStockType = defaultStockType
	}

	// 3. Roll fan-out mode — creates N individual HUs
	if p.RollCount != nil && *p.RollCount > 1 {
		return w.processGRRolls(ctx, uow, p, finalStockType)
	}

	// 4. Standard single-HU mode
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

	// Set stock type
	_, _ = uow.HU.GetDb().Exec(ctx, "UPDATE handling_units SET stock_type = $1 WHERE id = $2", finalStockType, huID)

	// 5. Create GR document
	status := p.Status
	if status == "" {
		status = "POSTED"
	}
	grID, err := uow.GR.Create(ctx, repository.GRDocument{
		TenantID:           p.TenantID,
		OrganisationID:     p.OrganisationID,
		SiteID:             p.SiteID,
		ZoneID:             p.ZoneID,
		Status:             status,
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

	// Add GR line
	err = uow.GR.AddLine(ctx, repository.GRLine{
		LineNumber:   1,
		ProductID:    p.ProductID,
		Quantity:     p.Quantity,
		Unit:         p.Unit,
		BatchRef:     p.BatchRef,
		ExpiryDate:   p.ExpiryDate,
		StockType:    finalStockType,
		MovementType: p.MovementType,
		HUID:         &huID,
	}, grID, p.TenantID)
	if err != nil {
		return nil, err
	}

	// Post inbound inventory event
	err = w.InventoryAgent.PostInboundEvent(ctx, uow, p.TenantID, huID, p.ProductID, p.Quantity, p.Unit, p.SiteID, p.ZoneID, p.ActorUserID, "GR_DOCUMENT", grID)
	if err != nil {
		return nil, err
	}

	// Stamp event stock type
	_, _ = uow.HU.GetDb().Exec(ctx, "UPDATE inventory_events SET stock_type = $1 WHERE hu_id = $2 AND event_type = 'GR'", finalStockType, huID)

	// Update PO line if linked
	if p.POLineID != 0 {
		if err = uow.Purchasing.UpdatePOLineReceived(ctx, p.TenantID, p.POLineID, p.Quantity); err != nil {
			return nil, fmt.Errorf("failed to update PO line: %w", err)
		}
		uow.Purchasing.UpdatePOStatus(ctx, p.TenantID, p.POID, "PARTIALLY_RECEIVED")
	}

	// Register barcode
	w.broadcast(ctx, "BarcodeAgent", "REGISTER_HU_BARCODE", "SUCCESS")
	_ = uow.Barcodes.Create(ctx, repository.CreateBarcodeParams{
		TenantID:   p.TenantID,
		Code:       huCode,
		EntityType: "HU",
		EntityID:   huID,
	})

	// Create putaway task
	if err = w.WarehouseAgent.CreatePutawayTask(ctx, uow, p.TenantID, huID, p.ZoneID); err != nil {
		return nil, err
	}

	// Audit log
	w.broadcast(ctx, "AuditAgent", "LOGGING_GR", "SUCCESS")
	uow.Audit.Log(ctx, p.TenantID, p.ActorUserID, "GR_POSTED", "GR_DOCUMENT", grID, nil, p)

	return map[string]any{
		"gr_id":   grID,
		"hu_id":   huID,
		"hu_code": huCode,
	}, nil
}

// processGRRolls creates N individual HUs for roll-level tracking.
// Each roll has: quantity = total / rollCount, serial_number = prefix-001..N
func (w *GRWorkflow) processGRRolls(ctx context.Context, uow *repository.UnitOfWork, p GRParams, finalStockType string) (map[string]any, error) {
	rollCount := *p.RollCount
	qtyPerRoll := p.Quantity / float64(rollCount)

	// Auto-generate prefix if not provided
	prefix := ""
	if p.RollPrefix != nil && *p.RollPrefix != "" {
		prefix = *p.RollPrefix
	} else {
		// Derive from product code: sanitize to alphanumeric + dash
		productCode := ""
		_ = uow.Zones.GetDb().QueryRow(ctx, "SELECT code FROM products WHERE id = $1", p.ProductID).Scan(&productCode)
		prefix = strings.ToUpper(strings.ReplaceAll(productCode, "-", "")) + "-" + time.Now().Format("0601")
	}

	// Create GR document
	status := p.Status
	if status == "" {
		status = "POSTED"
	}
	grID, err := uow.GR.Create(ctx, repository.GRDocument{
		TenantID:           p.TenantID,
		OrganisationID:     p.OrganisationID,
		SiteID:             p.SiteID,
		ZoneID:             p.ZoneID,
		Status:             status,
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

	var createdHUs []map[string]any

	for seq := 1; seq <= rollCount; seq++ {
		huCode, _ := uow.GR.GetNextHUCode(ctx, p.TenantID)
		serialNumber := fmt.Sprintf("%s-%03d", prefix, seq)

		huID, err := w.InventoryAgent.CreateHU(ctx, uow, CreateHUInput{
			TenantID:  p.TenantID,
			ProductID: p.ProductID,
			Code:      huCode,
			Quantity:  qtyPerRoll,
			Unit:      p.Unit,
			SiteID:    p.SiteID,
			ZoneID:    p.ZoneID,
			Status:    "IN_STOCK",
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create roll HU %d: %w", seq, err)
		}

		// Set stock type + serial + roll metadata
		_, _ = uow.HU.GetDb().Exec(ctx,
			`UPDATE handling_units SET stock_type = $1, serial_number = $2, roll_prefix = $3, roll_sequence = $4 WHERE id = $5`,
			finalStockType, serialNumber, prefix, seq, huID)

		// GR line per roll
		_ = uow.GR.AddLine(ctx, repository.GRLine{
			LineNumber:   seq,
			ProductID:    p.ProductID,
			Quantity:     qtyPerRoll,
			Unit:         p.Unit,
			BatchRef:     p.BatchRef,
			StockType:    finalStockType,
			MovementType: p.MovementType,
			HUID:         &huID,
		}, grID, p.TenantID)

		// Inventory event
		_ = w.InventoryAgent.PostInboundEvent(ctx, uow, p.TenantID, huID, p.ProductID, qtyPerRoll, p.Unit, p.SiteID, p.ZoneID, p.ActorUserID, "GR_DOCUMENT", grID)
		_, _ = uow.HU.GetDb().Exec(ctx, "UPDATE inventory_events SET stock_type = $1 WHERE hu_id = $2 AND event_type = 'GR'", finalStockType, huID)

		// Register barcode
		_ = uow.Barcodes.Create(ctx, repository.CreateBarcodeParams{
			TenantID:   p.TenantID,
			Code:       huCode,
			EntityType: "HU",
			EntityID:   huID,
		})

		// Register barcode for serial number too
		_ = uow.Barcodes.Create(ctx, repository.CreateBarcodeParams{
			TenantID:   p.TenantID,
			Code:       serialNumber,
			EntityType: "HU",
			EntityID:   huID,
		})

		// Putaway task per roll
		_ = w.WarehouseAgent.CreatePutawayTask(ctx, uow, p.TenantID, huID, p.ZoneID)

		createdHUs = append(createdHUs, map[string]any{
			"hu_id":         huID,
			"hu_code":       huCode,
			"serial_number": serialNumber,
			"quantity":      qtyPerRoll,
			"roll_sequence": seq,
		})
	}

	// Update PO line if linked (total quantity)
	if p.POLineID != 0 {
		if err = uow.Purchasing.UpdatePOLineReceived(ctx, p.TenantID, p.POLineID, p.Quantity); err != nil {
			return nil, fmt.Errorf("failed to update PO line: %w", err)
		}
		uow.Purchasing.UpdatePOStatus(ctx, p.TenantID, p.POID, "PARTIALLY_RECEIVED")
	}

	uow.Audit.Log(ctx, p.TenantID, p.ActorUserID, "GR_ROLL_POSTED", "GR_DOCUMENT", grID, nil, p)

	return map[string]any{
		"gr_id":     grID,
		"roll_count": rollCount,
		"hu_list":   createdHUs,
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
