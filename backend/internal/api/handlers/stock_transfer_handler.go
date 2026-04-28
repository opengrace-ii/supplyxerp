package handlers

import (
	"context"
	"fmt"
	"net/http"
	"regexp"

	"supplyxerp/backend/internal/agent/inventory"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StockTransferHandler struct {
	Repo  *repository.UnitOfWork
	Agent *inventory.Agent
	Pool  *pgxpool.Pool
}

func NewStockTransferHandler(repo *repository.UnitOfWork, agent *inventory.Agent, pool *pgxpool.Pool) *StockTransferHandler {
	return &StockTransferHandler{Repo: repo, Agent: agent, Pool: pool}
}

// uuidRegex detects UUID format so the frontend can pass public_id or hu_code interchangeably.
var uuidRegex = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

type StockTransferRequest struct {
	HUCode      string  `json:"hu_code" binding:"required"`
	FromZoneID  *int64  `json:"from_zone_id"`  // optional — auto-resolved from HU record if absent
	ToZoneID    int64   `json:"to_zone_id" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	ToStockType string  `json:"to_stock_type" binding:"required"`
	Reason      string  `json:"reason" binding:"required"`
}

func (h *StockTransferHandler) TransferStock(c *gin.Context) {
	var req StockTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := mustTenantID(c)
	userID := mustUserID(c)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	uow := repository.NewUnitOfWork(tx)

	// 1. Resolve HU — accept HU code string OR UUID public_id
	hu, err := uow.HU.GetByBarcode(c.Request.Context(), tenantID, req.HUCode)
	if err != nil {
		if uuidRegex.MatchString(req.HUCode) {
			// Try public_id lookup
			var huID int64
			err2 := uow.HU.GetDb().QueryRow(c.Request.Context(),
				`SELECT id FROM handling_units WHERE public_id = $1::uuid AND tenant_id = $2`,
				req.HUCode, tenantID).Scan(&huID)
			if err2 == nil {
				hu, err = uow.HU.GetByID(c.Request.Context(), huID)
			}
		}
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("HU not found: %s", req.HUCode)})
			return
		}
	}

	// 2. Auto-resolve FromZoneID from HU's current zone if not sent
	if req.FromZoneID == nil {
		zoneID := hu.ZoneID.Int64
		req.FromZoneID = &zoneID
	}

	huQty, _ := hu.Quantity.Float64Value()
	if req.Quantity > huQty.Float64 {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("transfer quantity (%.4f) exceeds HU quantity (%.4f)", req.Quantity, huQty.Float64)})
		return
	}

	// 3. Resolve target site
	siteID := uow.Zones.GetSiteID(c.Request.Context(), req.ToZoneID)

	var finalHUID int64
	var isSplit bool

	if req.Quantity < huQty.Float64 {
		// Partial transfer → SPLIT
		isSplit = true
		childCode, err := uow.GR.GetNextHUCode(c.Request.Context(), tenantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		childID, err := h.Agent.CreateHU(c.Request.Context(), uow, inventory.CreateHUInput{
			TenantID:   tenantID,
			ProductID:  hu.ProductID.Int64,
			Code:       childCode,
			Quantity:   req.Quantity,
			Unit:       hu.Unit,
			SiteID:     siteID,
			ZoneID:     req.ToZoneID,
			Status:     "IN_STOCK",
			ParentHUID: &hu.ID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Set child stock type
		if _, err = tx.Exec(c.Request.Context(), "UPDATE handling_units SET stock_type = $1 WHERE id = $2", req.ToStockType, childID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Reduce parent quantity
		newParentQty := huQty.Float64 - req.Quantity
		if _, err = tx.Exec(c.Request.Context(), "UPDATE handling_units SET quantity = $1, updated_at = NOW() WHERE id = $2", newParentQty, hu.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Register child barcode
		_ = uow.Barcodes.Create(c.Request.Context(), repository.CreateBarcodeParams{
			TenantID:   tenantID,
			Code:       childCode,
			EntityType: "HU",
			EntityID:   childID,
		})

		_ = h.Agent.PostSplitEvent(c.Request.Context(), uow, tenantID, hu.ID, childID, req.Quantity, userID)
		_ = h.postTransferEvent(c.Request.Context(), uow, tenantID, childID, hu.ProductID.Int64, *req.FromZoneID, req.ToZoneID, req.Quantity, hu.StockType, req.ToStockType, userID, req.Reason)

		finalHUID = childID
	} else {
		// Full transfer
		finalHUID = hu.ID
		if _, err = tx.Exec(c.Request.Context(), "UPDATE handling_units SET zone_id = $1, site_id = $2, stock_type = $3, updated_at = NOW() WHERE id = $4",
			req.ToZoneID, siteID, req.ToStockType, hu.ID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		_ = h.postTransferEvent(c.Request.Context(), uow, tenantID, hu.ID, hu.ProductID.Int64, *req.FromZoneID, req.ToZoneID, req.Quantity, hu.StockType, req.ToStockType, userID, req.Reason)
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	h.Agent.Hub.Broadcast("stock_transferred", map[string]any{
		"tenant_id":    tenantID,
		"hu_id":        finalHUID,
		"from_zone_id": req.FromZoneID,
		"to_zone_id":   req.ToZoneID,
		"quantity":     req.Quantity,
		"is_split":     isSplit,
	})

	// Audit log
	_ = uow.Audit.Log(c.Request.Context(), tenantID, userID, "STOCK_TRANSFERRED", "handling_unit", hu.PublicID, hu, req)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Stock transferred successfully"})
}

func (h *StockTransferHandler) postTransferEvent(ctx context.Context, uow *repository.UnitOfWork, tenantID, huID, productID, fromZone, toZone int64, qty float64, fromType, toType string, userID int64, notes string) error {
	_, err := uow.Events.CreateWithZone(ctx, repository.CreateEventZoneParams{
		TenantID:    tenantID,
		EventType:   "ZONE_TRANSFER",
		HuID:        huID,
		ProductID:   &productID,
		FromZoneID:  &fromZone,
		ToZoneID:    &toZone,
		Quantity:    0, // Zone transfers don't change global balance
		Unit:        "EA",
		ActorUserID: userID,
		Metadata:    []byte(fmt.Sprintf(`{"from_stock_type": "%s", "to_stock_type": "%s", "reason": "%s"}`, fromType, toType, notes)),
	})
	return err
}
