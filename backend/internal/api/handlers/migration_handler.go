package handlers

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"supplyxerp/backend/internal/db/dbgen"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type MigrationHandler struct {
	Repo        *repository.UnitOfWork
	Pool        *pgxpool.Pool
	BarcodeRepo *repository.BarcodeRepository
}

func NewMigrationHandler(repo *repository.UnitOfWork, pool *pgxpool.Pool) *MigrationHandler {
	return &MigrationHandler{Repo: repo, Pool: pool, BarcodeRepo: repo.Barcodes}
}

func (h *MigrationHandler) GetStatus(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	
	var prodCount int
	h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM products WHERE tenant_id = $1", tenantID).Scan(&prodCount)
	
	var obCount int
	h.Pool.QueryRow(c.Request.Context(), "SELECT COALESCE(SUM(posted_lines), 0) FROM opening_balance_imports WHERE tenant_id = $1", tenantID).Scan(&obCount)
	
	cfg, _ := h.Repo.Config.GetByTenant(c.Request.Context(), tenantID)

	c.JSON(http.StatusOK, gin.H{
		"products_count":          prodCount,
		"opening_balances_posted": obCount,
		"go_live_date":            cfg.GoLiveDate,
	})
}

func (h *MigrationHandler) DownloadProductTemplate(c *gin.Context) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=\"supplyxerp_products_template.csv\"")
	c.String(http.StatusOK, "code,name,base_unit,description\nFAB-001,Fabric Roll,KG,Woven cotton fabric\nLAM-001,Laminate Sheet,IMP,PVC laminate")
}

func (h *MigrationHandler) DownloadOBTemplate(c *gin.Context) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=\"supplyxerp_opening_balances_template.csv\"")
	c.String(http.StatusOK, "product_code,quantity,unit,zone_code,batch_ref,as_of_date\nFAB-001,315,KG,STOR-01,,2026-01-01\nLAM-001,21.16,IMP,STOR-02,,2026-01-01")
}

func (h *MigrationHandler) ImportProducts(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	src, _ := file.Open()
	defer src.Close()
	reader := csv.NewReader(src)
	
	// Skip header
	_, _ = reader.Read()

	results := []map[string]any{}
	success, skipped, failed := 0, 0, 0

	for {
		record, err := reader.Read()
		if err == io.EOF { break }
		if err != nil { failed++; continue }

		code, name, unit, desc := record[0], record[1], record[2], record[3]
		
		// Check exists
		var exists bool
		h.Pool.QueryRow(c.Request.Context(), "SELECT EXISTS(SELECT 1 FROM products WHERE tenant_id=$1 AND code=$2)", tenantID, code).Scan(&exists)
		
		if exists {
			skipped++
			results = append(results, map[string]any{"code": code, "status": "SKIPPED", "detail": "Product already exists"})
			continue
		}

		// Create
		_, err = h.Repo.Products.Create(c.Request.Context(), dbgen.Product{
			TenantID: pgtype.Int8{Int64: tenantID, Valid: true}, 
			Code: code, 
			Name: name, 
			BaseUnit: unit, 
			Description: pgtype.Text{String: desc, Valid: true},
		})
		
		if err != nil {
			failed++
			results = append(results, map[string]any{"code": code, "status": "FAILED", "detail": err.Error()})
		} else {
			success++
			results = append(results, map[string]any{"code": code, "status": "SUCCESS", "detail": ""})
		}
	}

	c.JSON(http.StatusOK, gin.H{"total": success + skipped + failed, "success": success, "skipped": skipped, "failed": failed, "results": results})
}

func (h *MigrationHandler) ImportOpeningBalances(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)
	file, _ := c.FormFile("file")
	importDateStr := c.PostForm("import_date")
	defZoneIDStr := c.PostForm("zone_id")
	
	importDate, _ := time.Parse("2006-01-02", importDateStr)
	defZoneID, _ := strconv.ParseInt(defZoneIDStr, 10, 64)

	src, _ := file.Open()
	defer src.Close()
	records, _ := csv.NewReader(src).ReadAll()
	
	batchID, _ := h.Repo.Migration.CreateImportBatch(c.Request.Context(), repository.OpeningBalanceImport{
		TenantID: tenantID, ImportDate: importDate, TotalLines: len(records) - 1, Status: "PROCESSING",
	})

	success, failed := 0, 0
	results := []map[string]any{}
	errorLog := []string{}

	for idx, row := range records {
		if idx == 0 { continue }
		pCode, qtyStr, unit, zCode, _ := row[0], row[1], row[2], row[3], row[4]
		qty, _ := strconv.ParseFloat(qtyStr, 64)

		// 1. Resolve Product
		var pID int64
		err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM products WHERE tenant_id=$1 AND code=$2", tenantID, pCode).Scan(&pID)
		if err != nil {
			failed++
			msg := fmt.Sprintf("Row %d: Product %s not found", idx, pCode)
			errorLog = append(errorLog, msg)
			results = append(results, map[string]any{"product": pCode, "status": "FAILED", "detail": "Not found"})
			continue
		}

		// 2. Resolve Zone
		var zID int64 = defZoneID
		if zCode != "" {
			h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM zones WHERE tenant_id=$1 AND code=$2", tenantID, zCode).Scan(&zID)
		}

		// 3. Create HU
		huCode := fmt.Sprintf("OB-%s-%d", pCode, time.Now().UnixNano()%100000)
		
		var huID int64
		err = h.Pool.QueryRow(c.Request.Context(), `
			INSERT INTO handling_units (tenant_id, product_id, code, quantity, unit, zone_id, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id
		`, tenantID, pID, huCode, qty, unit, zID, "IN_STOCK").Scan(&huID)
		
		if err != nil {
			failed++
			errorLog = append(errorLog, fmt.Sprintf("Row %d: HU creation failed: %v", idx, err))
			continue
		}

		// 4. Barcode
		h.Repo.Barcodes.Create(c.Request.Context(), repository.CreateBarcodeParams{
			TenantID:   tenantID, Code: huCode, EntityType: "HU", EntityID: huID,
		})

		// 5. Event
		h.Repo.Events.CreateWithZone(c.Request.Context(), repository.CreateEventZoneParams{
			TenantID: tenantID, EventType: "OPENING_BALANCE", HuID: huID, ProductID: &pID, Quantity: qty, Unit: unit, ActorUserID: actorID, Metadata: []byte(fmt.Sprintf(`{"reference": "IMPORT-%d"}`, batchID)),
		})

		success++
		results = append(results, map[string]any{"product": pCode, "qty": qty, "zone": zCode, "hu_code": huCode, "status": "SUCCESS"})
	}

	h.Repo.Migration.UpdateImportBatch(c.Request.Context(), batchID, success, failed, "COMPLETED", errorLog)
	c.JSON(http.StatusOK, gin.H{"import_id": batchID, "success": success, "failed": failed, "results": results})
}

func (h *MigrationHandler) UpdateGoLiveDate(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct{ Date string `json:"date"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsed, _ := time.Parse("2006-04-02", req.Date)
	cfg, _ := h.Repo.Config.GetByTenant(c.Request.Context(), tenantID)
	cfg.GoLiveDate = &parsed
	h.Repo.Config.Update(c.Request.Context(), *cfg)
	
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *MigrationHandler) ResetTenant(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)
	var req struct{ Confirmation string `json:"confirmation"` }
	c.ShouldBindJSON(&req)

	if req.Confirmation != "RESET TENANT" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid confirmation string"})
		return
	}

	// 1. Role Check
	var roleID int
	h.Pool.QueryRow(c.Request.Context(), "SELECT role_id FROM user_roles WHERE user_id=$1 AND role_id=1", actorID).Scan(&roleID)
	if roleID != 1 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin role required"})
		return
	}

	// 2. Snapshot (Count summary)
	var huCount, eventCount int64
	h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM handling_units WHERE tenant_id=$1", tenantID).Scan(&huCount)
	h.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM inventory_events WHERE tenant_id=$1", tenantID).Scan(&eventCount)
	
	snapshot := map[string]any{
		"hu_count":    huCount,
		"event_count": eventCount,
	}

	// 3. RESET
	tx, _ := h.Pool.Begin(c.Request.Context())
	defer tx.Rollback(c.Request.Context())

	queries := []string{
		"DELETE FROM gr_lines WHERE tenant_id=$1",
		"DELETE FROM gr_documents WHERE tenant_id=$1",
		"DELETE FROM warehouse_tasks WHERE tenant_id=$1",
		"DELETE FROM inventory_events WHERE tenant_id=$1",
		"DELETE FROM barcodes WHERE tenant_id=$1 AND entity_type='HU'",
		"DELETE FROM handling_units WHERE tenant_id=$1",
		"UPDATE tenant_sequences SET current_val = 0 WHERE tenant_id=$1",
	}

	for _, q := range queries {
		tx.Exec(c.Request.Context(), q, tenantID)
	}

	tx.Commit(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{"success": true, "snapshot": snapshot})
}

