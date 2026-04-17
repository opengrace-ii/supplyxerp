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

type ProductionWorkflow struct {
	Hub            *events.Hub
	InventoryAgent *Agent
	BarcodeAgent   *barcode.Agent
	WarehouseAgent *warehouse.Agent
}

type MoveParams struct {
	TenantID    int64  `json:"-"`
	HUCode      string `json:"hu_code" binding:"required"`
	ToZoneCode  string `json:"to_zone_code" binding:"required"`
	ActorUserID int64  `json:"-"`
}

type SplitParams struct {
	TenantID      int64   `json:"-"`
	ParentHUCode  string  `json:"parent_hu_code" binding:"required"`
	SplitQuantity float64 `json:"split_quantity" binding:"required"`
	ActorUserID   int64   `json:"-"`
}

type ConsumeParams struct {
	TenantID    int64   `json:"-"`
	HUCode      string  `json:"hu_code" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required"`
	ActorUserID int64   `json:"-"`
	Notes       string  `json:"notes"`
}

func (w *ProductionWorkflow) MoveHU(ctx context.Context, uow *repository.UnitOfWork, p MoveParams) error {
	w.broadcast(ctx, "ProductionAgent", "STARTING_MOVE", "SUCCESS")

	// 1. Resolve HU
	hu, err := uow.HU.GetByBarcode(ctx, p.TenantID, p.HUCode)
	if err != nil {
		return fmt.Errorf("HU not found: %s", p.HUCode)
	}

	// 2. Resolve Target Zone
	zone, err := uow.Zones.GetByCode(ctx, p.TenantID, p.ToZoneCode)
	if err != nil {
		return fmt.Errorf("Target zone not found: %s", p.ToZoneCode)
	}
	siteID := uow.Zones.GetSiteID(ctx, zone.ID)

	// 3. ErrorPrevention Check
	if zone.ZoneType == "RECEIVING" {
		w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_MOVE", "FAILED")
		return fmt.Errorf("Cannot move goods back to a RECEIVING zone")
	}
	if hu.ZoneID.Int64 == zone.ID {
		return fmt.Errorf("HU is already in zone %s", p.ToZoneCode)
	}

	// 4. Create and Complete Ad-hoc Task
	_, err = uow.WarehouseTasks.Create(ctx, repository.WarehouseTask{
		TenantID:   p.TenantID,
		TaskType:   "MOVE",
		Status:     "COMPLETED",
		HuID:       hu.ID,
		FromZoneID: &hu.ZoneID.Int64,
		ToZoneID:   &zone.ID,
		Priority:   1,
	})
	if err != nil {
		return err
	}

	// 5. Update HU Zone
	err = uow.HU.UpdateZone(ctx, hu.ID, zone.ID, siteID)
	if err != nil {
		return err
	}

	// 6. Post Move Event
	err = w.InventoryAgent.PostMoveEvent(ctx, uow, p.TenantID, hu.ID, hu.ZoneID.Int64, zone.ID, p.ActorUserID)
	if err != nil {
		return err
	}

	w.broadcast(ctx, "ProductionAgent", "MOVE_COMPLETED", "SUCCESS")
	return nil
}

func (w *ProductionWorkflow) SplitHU(ctx context.Context, uow *repository.UnitOfWork, p SplitParams) (string, error) {
	w.broadcast(ctx, "ProductionAgent", "STARTING_SPLIT", "SUCCESS")

	// 1. Resolve Parent
	parent, err := uow.HU.GetByBarcode(ctx, p.TenantID, p.ParentHUCode)
	if err != nil {
		return "", err
	}

	parentQty, _ := parent.Quantity.Float64Value()
	if p.SplitQuantity >= parentQty.Float64 {
		return "", fmt.Errorf("Split quantity (%.4f) must be less than parent quantity (%.4f)", p.SplitQuantity, parentQty.Float64)
	}

	// 2. Generate Child HU
	childCode, err := uow.GR.GetNextHUCode(ctx, p.TenantID)
	if err != nil {
		return "", err
	}

	// 3. Create Child HU Record
	childID, err := w.InventoryAgent.CreateHU(ctx, uow, CreateHUInput{
		TenantID:   p.TenantID,
		ProductID:  parent.ProductID.Int64,
		Code:       childCode,
		Quantity:   p.SplitQuantity,
		Unit:       parent.Unit,
		SiteID:     parent.SiteID.Int64,
		ZoneID:     parent.ZoneID.Int64,
		ParentHUID: &parent.ID,
	})
	if err != nil {
		return "", err
	}

	// 4. Update Parent
	newParentQty := parentQty.Float64 - p.SplitQuantity
	_, err = uow.HU.GetDb().Exec(ctx, "UPDATE handling_units SET quantity = $1, label_version = label_version + 1, updated_at = now() WHERE id = $2", newParentQty, parent.ID)
	if err != nil {
		return "", err
	}

	// 5. Register Barcode
	err = uow.Barcodes.Create(ctx, repository.CreateBarcodeParams{
		TenantID:   p.TenantID,
		Code:       childCode,
		EntityType: "HU",
		EntityID:   childID,
	})

	// 6. Post Split Events (Debit Parent, Credit Child)
	err = w.InventoryAgent.PostSplitEvent(ctx, uow, p.TenantID, parent.ID, childID, p.SplitQuantity, p.ActorUserID)
	if err != nil {
		return "", err
	}

	w.broadcast(ctx, "ProductionAgent", "SPLIT_COMPLETED", "SUCCESS")
	return childCode, nil
}

func (w *ProductionWorkflow) ConsumeHU(ctx context.Context, uow *repository.UnitOfWork, p ConsumeParams) error {
	w.broadcast(ctx, "ProductionAgent", "STARTING_CONSUME", "SUCCESS")

	// 1. Resolve HU
	hu, err := uow.HU.GetByBarcode(ctx, p.TenantID, p.HUCode)
	if err != nil {
		return err
	}

	// Validation: Zone type must be PRODUCTION or STORAGE
	var zType string
	err = uow.Zones.GetDb().QueryRow(ctx, "SELECT zone_type FROM zones WHERE id = $1", hu.ZoneID.Int64).Scan(&zType)
	if err != nil || (zType != "PRODUCTION" && zType != "STORAGE") {
		w.broadcast(ctx, "ErrorPreventionAgent", "VALIDATING_CONSUME", "FAILED")
		return fmt.Errorf("Consumption not allowed in current zone type: %s", zType)
	}

	targetHUID := hu.ID
	consumeQty := p.Quantity

	huQty, _ := hu.Quantity.Float64Value()

	// 2. Partial Consumption Path (Pipeline B)
	if p.Quantity < huQty.Float64 {
		w.broadcast(ctx, "ProductionAgent", "TRIGGERING_AUTO_SPLIT", "SUCCESS")
		// Split first
		newHuCode, err := w.SplitHU(ctx, uow, SplitParams{
			TenantID:      p.TenantID,
			ParentHUCode:  p.HUCode,
			SplitQuantity: p.Quantity,
			ActorUserID:   p.ActorUserID,
		})
		if err != nil {
			return err
		}
		
		// Target the child for consumption
		child, _ := uow.HU.GetByBarcode(ctx, p.TenantID, newHuCode)
		targetHUID = child.ID
	}

	// 3. Mark target as VOIDED/CONSUMED
	now := time.Now()
	_, err = uow.HU.GetDb().Exec(ctx, `
		UPDATE handling_units 
		SET quantity = 0, status = 'VOIDED', consumed_at = $1, consumed_by = $2, updated_at = now() 
		WHERE id = $3
	`, now, p.ActorUserID, targetHUID)
	if err != nil {
		return err
	}

	// 4. Post Consume Event
	err = w.InventoryAgent.PostConsumeEvent(ctx, uow, p.TenantID, targetHUID, consumeQty, p.ActorUserID, p.Notes)
	if err != nil {
		return err
	}

	w.broadcast(ctx, "ProductionAgent", "CONSUME_COMPLETED", "SUCCESS")
	return nil
}

func (w *ProductionWorkflow) broadcast(ctx context.Context, agent, action, status string) {
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

