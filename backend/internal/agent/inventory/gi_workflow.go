package inventory

import (
	"context"
	"fmt"
	"time"

	"supplyxerp/backend/internal/events"
	"supplyxerp/backend/internal/repository"
)

type GIWorkflow struct {
	Hub            *events.Hub
	InventoryAgent *Agent
}

type GIParams struct {
	TenantID       int64
	OrganisationID int64
	SiteID         int64
	ZoneID         int64      // source zone where goods are issued from
	ProductID      int64
	Quantity       float64
	Unit           string
	DocumentDate   time.Time
	PostingDate    time.Time
	MovementType   string     // 261=Production, 551=Scrap, 601=Sales
	ReasonCode     string
	ReasonText     string
	CostCentre     string
	ReferenceType  string     // BUILD_ORDER, SALES_ORDER, MANUAL
	ReferenceID    *int64
	Notes          string
	StockType      string
	ActorUserID    int64
	HUID           *int64     // optional: specific HU to issue from
	ReservationID  *int64     // optional: fulfil a reservation
}

// ProcessGI handles goods issue: validates stock, creates GI document, posts outbound event, adjusts HU
func (w *GIWorkflow) ProcessGI(ctx context.Context, uow *repository.UnitOfWork, p GIParams) (map[string]any, error) {
	w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_GI", "SUCCESS")

	// 1. Validate: stock must exist for this product in the source zone
	var availableQty float64
	err := uow.Zones.GetDb().QueryRow(ctx, `
		SELECT COALESCE(SUM(quantity), 0) 
		FROM handling_units 
		WHERE product_id = $1 AND zone_id = $2 AND tenant_id = $3 
		  AND status = 'IN_STOCK' AND stock_type = 'UNRESTRICTED'
	`, p.ProductID, p.ZoneID, p.TenantID).Scan(&availableQty)
	if err != nil {
		return nil, fmt.Errorf("failed to check stock: %w", err)
	}

	if availableQty < p.Quantity {
		w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_GI", "FAILED")
		return nil, fmt.Errorf("insufficient stock: available %.4f %s, requested %.4f %s",
			availableQty, p.Unit, p.Quantity, p.Unit)
	}

	// 2. Find the HU(s) to issue from
	var huID int64
	var huCode string
	var huQty float64

	if p.HUID != nil && *p.HUID > 0 {
		// Specific HU requested
		err = uow.Zones.GetDb().QueryRow(ctx, `
			SELECT id, code, quantity FROM handling_units 
			WHERE id = $1 AND tenant_id = $2 AND status = 'IN_STOCK'
		`, *p.HUID, p.TenantID).Scan(&huID, &huCode, &huQty)
		if err != nil {
			return nil, fmt.Errorf("HU not found or not in stock")
		}
	} else {
		// Auto-select: pick the first HU in the zone with enough stock (FIFO)
		err = uow.Zones.GetDb().QueryRow(ctx, `
			SELECT id, code, quantity FROM handling_units 
			WHERE product_id = $1 AND zone_id = $2 AND tenant_id = $3 
			  AND status = 'IN_STOCK' AND stock_type = 'UNRESTRICTED'
			  AND quantity >= $4
			ORDER BY created_at ASC
			LIMIT 1
		`, p.ProductID, p.ZoneID, p.TenantID, p.Quantity).Scan(&huID, &huCode, &huQty)
		if err != nil {
			return nil, fmt.Errorf("no single HU found with sufficient stock (%.4f %s)", p.Quantity, p.Unit)
		}
	}

	// 3. Create GI document
	status := "POSTED"
	giID, err := uow.GI.Create(ctx, repository.GIDocument{
		TenantID:       p.TenantID,
		OrganisationID: p.OrganisationID,
		SiteID:         p.SiteID,
		ZoneID:         p.ZoneID,
		Status:         status,
		DocumentDate:   p.DocumentDate,
		PostingDate:    p.PostingDate,
		MovementType:   p.MovementType,
		ReasonCode:     p.ReasonCode,
		ReasonText:     p.ReasonText,
		CostCentre:     p.CostCentre,
		ReferenceType:  p.ReferenceType,
		ReferenceID:    p.ReferenceID,
		Notes:          p.Notes,
		PostedBy:       &p.ActorUserID,
		CreatedBy:      &p.ActorUserID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create GI document: %w", err)
	}

	// 4. Add GI line
	err = uow.GI.AddLine(ctx, repository.GILine{
		LineNumber:   1,
		ProductID:    p.ProductID,
		Quantity:     p.Quantity,
		Unit:         p.Unit,
		StockType:    p.StockType,
		MovementType: p.MovementType,
		HUID:         &huID,
	}, giID, p.TenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to add GI line: %w", err)
	}

	// 5. Post outbound inventory event (negative quantity)
	err = w.InventoryAgent.PostOutboundEvent(ctx, uow, p.TenantID, huID, p.ProductID,
		p.Quantity, p.Unit, p.SiteID, p.ZoneID, p.ActorUserID, "GI_DOCUMENT", giID)
	if err != nil {
		return nil, fmt.Errorf("failed to post outbound event: %w", err)
	}

	// 6. Update HU quantity
	newQty := huQty - p.Quantity
	if newQty <= 0 {
		// Fully consumed — void the HU
		_, _ = uow.HU.GetDb().Exec(ctx, "UPDATE handling_units SET quantity = 0, status = 'VOIDED', updated_at = NOW() WHERE id = $1", huID)
	} else {
		// Partial issue — reduce quantity
		_, _ = uow.HU.GetDb().Exec(ctx, "UPDATE handling_units SET quantity = $1, updated_at = NOW() WHERE id = $2", newQty, huID)
	}

	// 7. Fulfil reservation if linked
	if p.ReservationID != nil && *p.ReservationID > 0 {
		_ = uow.Reservations.Consume(ctx, p.TenantID, *p.ReservationID, p.Quantity)
	}

	// 8. Audit log
	w.broadcast(ctx, "AuditAgent", "LOGGING_GI", "SUCCESS")
	uow.Audit.Log(ctx, p.TenantID, p.ActorUserID, "GI_POSTED", "GI_DOCUMENT", giID, nil, map[string]any{
		"gi_id":         giID,
		"movement_type": p.MovementType,
		"product_id":    p.ProductID,
		"quantity":      p.Quantity,
		"hu_code":       huCode,
	})

	return map[string]any{
		"gi_id":         giID,
		"hu_id":         huID,
		"hu_code":       huCode,
		"movement_type": p.MovementType,
		"quantity":      p.Quantity,
		"remaining_qty": newQty,
	}, nil
}

func (w *GIWorkflow) broadcast(ctx context.Context, agent, action, status string) {
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
