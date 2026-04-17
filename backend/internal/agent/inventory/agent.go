package inventory

import (
	"context"
	"fmt"
	"math/big"
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

type CreateHUInput struct {
	TenantID    int64
	ProductID   int64
	Code        string
	Quantity    float64
	Unit        string
	SiteID      int64
	ZoneID      int64
	Status      string
	ParentHUID  *int64
}

func (a *Agent) CreateHU(ctx context.Context, uow *repository.UnitOfWork, in CreateHUInput) (int64, error) {
	a.broadcast(ctx, "InventoryAgent", "CREATING_HU", "SUCCESS")
	
	var huID int64
	err := uow.Zones.GetDb().QueryRow(ctx, `
		INSERT INTO handling_units (tenant_id, product_id, code, quantity, unit, site_id, zone_id, status, parent_hu_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`, in.TenantID, in.ProductID, in.Code, in.Quantity, in.Unit, in.SiteID, in.ZoneID, "IN_STOCK", in.ParentHUID).Scan(&huID)
	
	if err != nil {
		a.broadcast(ctx, "InventoryAgent", "CREATING_HU", "FAILED")
		return 0, err
	}
	return huID, nil
}

func (a *Agent) PostInboundEvent(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, huID int64, productID int64, quantity float64, unit string, siteID int64, zoneID int64, actorID int64, refType string, refID int64) error {
	a.broadcast(ctx, "InventoryAgent", "POSTING_LEDGER_EVENT", "SUCCESS")
	
	// Create inventory event
	_, err := uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "GR",
		HuID:        huID,
		ProductID:   &productID,
		ToZoneID:    &zoneID,
		ToSiteID:    &siteID,
		Quantity:    quantity,
		Unit:        unit,
		ActorUserID: actorID,
		Metadata:    []byte(fmt.Sprintf(`{"reference_type": "%s", "reference_id": %d}`, refType, refID)),
	})
	
	if err == nil {
		a.broadcastStockUpdate(ctx, tenantID, huID, productID, zoneID, "GR", quantity)
	} else {
		a.broadcast(ctx, "InventoryAgent", "POSTING_LEDGER_EVENT", "FAILED")
	}
	return err
}

func (a *Agent) PostAdjustmentEvent(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, userID int64, huID int64, physicalCount float64, reason string) error {
	// 1. Get current
	var currentQty float64
	var productID, zoneID int64
	var huCode string
	err := uow.HU.GetDb().QueryRow(ctx, "SELECT quantity, product_id, zone_id, code FROM handling_units WHERE id = $1 AND tenant_id = $2", huID, tenantID).Scan(&currentQty, &productID, &zoneID, &huCode)
	if err != nil {
		return err
	}

	delta := physicalCount - currentQty
	if delta == 0 {
		return nil // No change
	}

	// 2. Post Event
	a.broadcast(ctx, "InventoryAgent", "POSTING_ADJUSTMENT", "SUCCESS")
	eventID, err := uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "ADJUST",
		HuID:        huID,
		ProductID:   &productID,
		ToZoneID:    &zoneID,
		Quantity:    delta,
		ActorUserID: userID,
		Metadata:    []byte(fmt.Sprintf(`{"reason": "%s", "before": %.4f, "after": %.4f}`, reason, currentQty, physicalCount)),
	})
	if err != nil {
		a.broadcast(ctx, "InventoryAgent", "POSTING_ADJUSTMENT", "FAILED")
		return err
	}

	// 2.1 Create Formal Stock Adjustment Document
	saNumber, err := uow.Stock.GenerateSANumber(ctx, tenantID)
	if err != nil {
		return err
	}

	var siteID int64
	_ = uow.Zones.GetDb().QueryRow(ctx, "SELECT site_id FROM zones WHERE id = $1", zoneID).Scan(&siteID)

	_, err = uow.Stock.CreateAdjustment(ctx, dbgen.StockAdjustment{
		TenantID:           tenantID,
		SaNumber:           saNumber,
		DocumentDate:       pgtype.Date{Time: time.Now(), Valid: true},
		PostingDate:        pgtype.Date{Time: time.Now(), Valid: true},
		AdjustmentType:     "PHYSICAL_COUNT",
		HuID:               pgtype.Int8{Int64: huID, Valid: true},
		ProductID:           productID,
		ZoneID:             zoneID,
		SiteID:             siteID,
		SystemQuantity:     numericFromFloat(currentQty),
		PhysicalCount:      numericFromFloat(physicalCount),
		QuantityDifference: numericFromFloat(delta),
		Unit:               "EA", // Should fetch from product/hu
		ReasonText:         reason,
		PostedBy:           pgtype.Int8{Int64: userID, Valid: true},
		InventoryEventID:   pgtype.Int8{Int64: eventID, Valid: true},
	})
	if err != nil {
		return err
	}

	// 3. Update HU Status and Quantity
	status := "IN_STOCK"
	if physicalCount <= 0 {
		status = "VOIDED"
	}

	_, err = uow.HU.GetDb().Exec(ctx, "UPDATE handling_units SET quantity = $1, status = $2, updated_at = NOW() WHERE id = $3", physicalCount, status, huID)
	
	if err == nil {
		a.broadcastStockUpdate(ctx, tenantID, huID, productID, zoneID, "ADJUST", delta)
	}

	return err
}

func (a *Agent) PostMoveEvent(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, huID int64, fromZoneID, toZoneID int64, actorID int64) error {
	a.broadcast(ctx, "InventoryAgent", "POSTING_MOVE_EVENT", "SUCCESS")

	// Get common details
	var productID int64
	var quantity float64
	var unit string
	err := uow.HU.GetDb().QueryRow(ctx, "SELECT product_id, quantity, unit FROM handling_units WHERE id = $1", huID).Scan(&productID, &quantity, &unit)
	if err != nil {
		return err
	}

	_, err = uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "MOVE",
		HuID:        huID,
		ProductID:   &productID,
		FromZoneID:  &fromZoneID,
		ToZoneID:    &toZoneID,
		Quantity:    0, // Movement doesn't change global inventory balance
		Unit:        unit,
		ActorUserID: actorID,
	})

	return err
}

func (a *Agent) PostSplitEvent(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, parentID, childID int64, quantity float64, actorID int64) error {
	a.broadcast(ctx, "InventoryAgent", "POSTING_SPLIT_EVENT", "SUCCESS")

	var productID int64
	var unit string
	err := uow.HU.GetDb().QueryRow(ctx, "SELECT product_id, unit FROM handling_units WHERE id = $1", parentID).Scan(&productID, &unit)
	if err != nil {
		return err
	}

	// 1. Debit parent
	_, err = uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "SPLIT_DEBIT",
		HuID:        parentID,
		ProductID:   &productID,
		Quantity:    -quantity,
		Unit:        unit,
		ActorUserID: actorID,
	})
	if err != nil {
		return err
	}

	// 2. Credit child
	_, err = uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "SPLIT_CREDIT",
		HuID:        childID,
		ProductID:   &productID,
		Quantity:    quantity,
		Unit:        unit,
		ActorUserID: actorID,
		Metadata:    []byte(fmt.Sprintf(`{"parent_hu_id": %d}`, parentID)),
	})

	return err
}

func (a *Agent) PostConsumeEvent(ctx context.Context, uow *repository.UnitOfWork, tenantID int64, huID int64, quantity float64, actorID int64, notes string) error {
	a.broadcast(ctx, "InventoryAgent", "POSTING_CONSUME_EVENT", "SUCCESS")

	var productID, zoneID int64
	var unit string
	err := uow.HU.GetDb().QueryRow(ctx, "SELECT product_id, zone_id, unit FROM handling_units WHERE id = $1", huID).Scan(&productID, &zoneID, &unit)
	if err != nil {
		return err
	}

	_, err = uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "CONSUME",
		HuID:        huID,
		ProductID:   &productID,
		ToZoneID:    &zoneID,
		Quantity:    -quantity,
		Unit:        unit,
		ActorUserID: actorID,
		Metadata:    []byte(fmt.Sprintf(`{"notes": "%s"}`, notes)),
	})

	if err == nil {
		a.broadcastStockUpdate(ctx, tenantID, huID, productID, zoneID, "CONSUME", -quantity)
	}

	return err
}

func (a *Agent) broadcastStockUpdate(ctx context.Context, tenantID int64, huID int64, productID int64, zoneID int64, eventType string, delta float64) {
	if a.Hub == nil {
		return
	}
	
	// Get helper info
	var pCode, zCode, huCode string
	_ = a.Hub.Db.QueryRow(ctx, "SELECT code FROM products WHERE id = $1", productID).Scan(&pCode)
	_ = a.Hub.Db.QueryRow(ctx, "SELECT code FROM zones WHERE id = $1", zoneID).Scan(&zCode)
	_ = a.Hub.Db.QueryRow(ctx, "SELECT code FROM handling_units WHERE id = $1", huID).Scan(&huCode)

	a.Hub.Broadcast("stock_update", map[string]any{
		"tenant_id":    tenantID,
		"product_id":   productID,
		"product_code": pCode,
		"zone_id":      zoneID,
		"zone_code":    zCode,
		"event_type":   eventType,
		"delta":        delta,
		"hu_code":      huCode,
		"timestamp":    time.Now().Format(time.RFC3339),
	})
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

func numericFromFloat(f float64) pgtype.Numeric {
	return pgtype.Numeric{
		Int:   bigInt(int64(f * 10000)),
		Exp:   -4,
		Valid: true,
	}
}

func bigInt(n int64) *big.Int {
	return big.NewInt(n)
}
