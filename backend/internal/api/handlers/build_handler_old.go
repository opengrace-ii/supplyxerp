package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"supplyxerp/backend/internal/logger"
	"supplyxerp/backend/internal/repository"
)

type BuildHandler struct {
	Pool *pgxpool.Pool
	Repo *repository.UnitOfWork
}

func (h *BuildHandler) ListBuildOrders(c *gin.Context) {
	status := c.Query("status")
	materialID := c.Query("material_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	query := `
		SELECT bo.*, p.name as output_material_name, p.code as output_material_code
		FROM build_orders bo
		LEFT JOIN products p ON bo.output_material_id = p.id
		WHERE 1=1
	`
	args := []any{}
	argIdx := 1

	if status != "" {
		query += fmt.Sprintf(" AND bo.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if materialID != "" {
		mid, _ := strconv.ParseInt(materialID, 10, 64)
		query += fmt.Sprintf(" AND bo.output_material_id = $%d", argIdx)
		args = append(args, mid)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY bo.created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		logger.LogError("API", "PRODUCTION", "ListBuildOrders", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch build orders"})
		return
	}
	defer rows.Close()

	var results []any
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			continue
		}
		colNames := rows.FieldDescriptions()
		m := make(map[string]any)
		for i, col := range colNames {
			m[string(col.Name)] = vals[i]
		}
		results = append(results, m)
	}

	c.JSON(http.StatusOK, gin.H{"build_orders": results})
}

func (h *BuildHandler) CreateBuildOrder(c *gin.Context) {
	var req struct {
		OutputMaterialID *int64  `json:"output_material_id"`
		OutputDescription string `json:"output_description"`
		PlannedQty       float64 `json:"planned_qty"`
		UnitOfMeasure    string  `json:"unit_of_measure"`
		PlannedStart     string  `json:"planned_start"`
		PlannedFinish    string  `json:"planned_finish"`
		ProductionZone   string  `json:"production_zone"`
		OutputZone       string  `json:"output_zone"`
		Priority         string  `json:"priority"`
		Notes            string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username, _ := c.Get("username")
	userStr := fmt.Sprintf("%v", username)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		logger.LogError("API", "PRODUCTION", "CreateBuildOrder", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	year := time.Now().Year()
	var seq int64
	err = tx.QueryRow(c.Request.Context(), "SELECT COALESCE(MAX(id), 0) + 1 FROM build_orders").Scan(&seq)
	if err != nil {
		seq = 1
	}
	orderNumber := fmt.Sprintf("BUILD-%d-%05d", year, seq)

	query := `
		INSERT INTO build_orders 
		(order_number, output_material_id, output_description, planned_qty, unit_of_measure, 
		 planned_start, planned_finish, production_zone, output_zone, priority, notes, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`
	var boID int64
	err = tx.QueryRow(c.Request.Context(), query,
		orderNumber, req.OutputMaterialID, req.OutputDescription, req.PlannedQty, req.UnitOfMeasure,
		req.PlannedStart, req.PlannedFinish, req.ProductionZone, req.OutputZone, req.Priority, req.Notes, userStr).Scan(&boID)

	if err != nil {
		logger.LogError("API", "PRODUCTION", "CreateBuildOrder", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create build order"})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	logger.LogInfo("PRODUCTION", "CreateBuildOrder", fmt.Sprintf("Build order created: %s (ID: %d)", orderNumber, boID))
	c.JSON(http.StatusCreated, gin.H{"id": boID, "order_number": orderNumber})
}

func (h *BuildHandler) GetBuildOrder(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	query := `
		SELECT bo.*, p.name as output_material_name, p.code as output_material_code
		FROM build_orders bo
		LEFT JOIN products p ON bo.output_material_id = p.id
		WHERE bo.id = $1
	`
	rows, err := h.Pool.Query(c.Request.Context(), query, id)
	if err != nil {
		logger.LogError("API", "PRODUCTION", "GetBuildOrder", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch build order"})
		return
	}
	defer rows.Close()

	if !rows.Next() {
		c.JSON(http.StatusNotFound, gin.H{"error": "Build order not found"})
		return
	}

	v, _ := rows.Values()
	colNames := rows.FieldDescriptions()
	res := make(map[string]any)
	for i, col := range colNames {
		res[string(col.Name)] = v[i]
	}
	rows.Close()

	// Get components
	compRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT bc.*, p.name as material_name, p.code as material_code
		FROM build_order_components bc
		LEFT JOIN products p ON bc.material_id = p.id
		WHERE bc.build_order_id = $1 ORDER BY sequence`, id)
	defer compRows.Close()
	var components []any
	for compRows.Next() {
		v, _ := compRows.Values()
		colNames := compRows.FieldDescriptions()
		m := make(map[string]any)
		for i, col := range colNames {
			m[string(col.Name)] = v[i]
		}
		components = append(components, m)
	}

	// Get issues
	issueRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT * FROM build_order_issues WHERE build_order_id = $1 ORDER BY issued_at DESC`, id)
	defer issueRows.Close()
	var issues []any
	for issueRows.Next() {
		v, _ := issueRows.Values()
		colNames := issueRows.FieldDescriptions()
		m := make(map[string]any)
		for i, col := range colNames {
			m[string(col.Name)] = v[i]
		}
		issues = append(issues, m)
	}

	// Get outputs
	outputRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT * FROM build_order_outputs WHERE build_order_id = $1 ORDER BY confirmed_at DESC`, id)
	defer outputRows.Close()
	var outputs []any
	for outputRows.Next() {
		v, _ := outputRows.Values()
		colNames := outputRows.FieldDescriptions()
		m := make(map[string]any)
		for i, col := range colNames {
			m[string(col.Name)] = v[i]
		}
		outputs = append(outputs, m)
	}

	c.JSON(http.StatusOK, gin.H{
		"build_order": res,
		"components":  components,
		"issues":      issues,
		"outputs":     outputs,
	})
}

func (h *BuildHandler) UpsertComponents(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Components []struct {
			Sequence    int     `json:"sequence"`
			MaterialID  *int64  `json:"material_id"`
			Description string  `json:"description"`
			RequiredQty float64 `json:"required_qty"`
			UOM         string  `json:"unit_of_measure"`
		} `json:"components"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		logger.LogError("API", "PRODUCTION", "UpsertComponents", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var status string
	err = tx.QueryRow(c.Request.Context(), "SELECT status FROM build_orders WHERE id = $1", id).Scan(&status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if status != "DRAFT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Components can only be edited in DRAFT status"})
		return
	}

	_, err = tx.Exec(c.Request.Context(), "DELETE FROM build_order_components WHERE build_order_id = $1", id)
	if err != nil {
		logger.LogError("API", "PRODUCTION", "UpsertComponents", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update components"})
		return
	}

	for _, comp := range req.Components {
		if comp.RequiredQty <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Required quantity must be positive"})
			return
		}
		_, err = tx.Exec(c.Request.Context(), `
			INSERT INTO build_order_components 
			(build_order_id, sequence, material_id, description, required_qty, unit_of_measure)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			id, comp.Sequence, comp.MaterialID, comp.Description, comp.RequiredQty, comp.UOM)
		if err != nil {
			logger.LogError("API", "PRODUCTION", "UpsertComponents", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert component"})
			return
		}
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BuildHandler) ReleaseBuildOrder(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		logger.LogError("API", "PRODUCTION", "ReleaseBuildOrder", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var status string
	var orderNum string
	err = tx.QueryRow(c.Request.Context(), "SELECT status, order_number FROM build_orders WHERE id = $1", id).Scan(&status, &orderNum)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if status != "DRAFT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only DRAFT orders can be released"})
		return
	}

	var count int
	err = tx.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM build_order_components WHERE build_order_id = $1", id).Scan(&count)
	if count == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Build order must have at least one component to be released"})
		return
	}

	_, err = tx.Exec(c.Request.Context(), "UPDATE build_orders SET status = 'RELEASED' WHERE id = $1", id)
	if err != nil {
		logger.LogError("API", "PRODUCTION", "ReleaseBuildOrder", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to release order"})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	logger.LogInfo("PRODUCTION", "ReleaseBuildOrder", fmt.Sprintf("Build order released: number=%s", orderNum))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BuildHandler) IssueMaterial(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		ComponentSeq    int     `json:"component_seq"`
		HUCode          string  `json:"hu_code"`
		MaterialID      *int64  `json:"material_id"`
		IssuedQty       float64 `json:"issued_qty"`
		UOM             string  `json:"unit_of_measure"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username, _ := c.Get("username")
	userStr := fmt.Sprintf("%v", username)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		logger.LogError("API", "PRODUCTION", "IssueMaterial", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	_, err = tx.Exec(c.Request.Context(), `
		INSERT INTO build_order_issues 
		(build_order_id, component_seq, hu_code, material_id, issued_qty, unit_of_measure, issued_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		id, req.ComponentSeq, req.HUCode, req.MaterialID, req.IssuedQty, req.UOM, userStr)
	if err != nil {
		logger.LogError("API", "PRODUCTION", "IssueMaterial", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record issue"})
		return
	}

	var required float64
	var currentIssued float64
	err = tx.QueryRow(c.Request.Context(), `
		UPDATE build_order_components 
		SET issued_qty = issued_qty + $1 
		WHERE build_order_id = $2 AND sequence = $3
		RETURNING required_qty, issued_qty`,
		req.IssuedQty, id, req.ComponentSeq).Scan(&required, &currentIssued)

	if err != nil {
		logger.LogError("API", "PRODUCTION", "IssueMaterial", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update component status"})
		return
	}

	issueStatus := "PARTIAL"
	if currentIssued >= required {
		issueStatus = "ISSUED"
	}
	if currentIssued > required {
		issueStatus = "EXCESS"
	}
	if currentIssued == 0 {
		issueStatus = "PENDING"
	}

	_, err = tx.Exec(c.Request.Context(), `
		UPDATE build_order_components SET issue_status = $1 
		WHERE build_order_id = $2 AND sequence = $3`,
		issueStatus, id, req.ComponentSeq)

	var orderStatus string
	err = tx.QueryRow(c.Request.Context(), "SELECT status FROM build_orders WHERE id = $1", id).Scan(&orderStatus)
	if orderStatus == "RELEASED" {
		_, _ = tx.Exec(c.Request.Context(), "UPDATE build_orders SET status = 'IN_PROGRESS', actual_start = NOW() WHERE id = $1", id)
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BuildHandler) ConfirmOutput(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		ConfirmedQty  float64 `json:"confirmed_qty"`
		OutputHUCode  string  `json:"output_hu_code"`
		OutputZone    string  `json:"output_zone"`
		Notes         string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username, _ := c.Get("username")
	userStr := fmt.Sprintf("%v", username)

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		logger.LogError("API", "PRODUCTION", "ConfirmOutput", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction failed"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var bo struct {
		OrderNumber      string
		OutputMaterialID *int64
		PlannedQty       float64
		ActualQty        float64
	}
	err = tx.QueryRow(c.Request.Context(), "SELECT order_number, output_material_id, planned_qty, actual_qty FROM build_orders WHERE id = $1", id).Scan(
		&bo.OrderNumber, &bo.OutputMaterialID, &bo.PlannedQty, &bo.ActualQty,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	_, err = tx.Exec(c.Request.Context(), `
		INSERT INTO build_order_outputs 
		(build_order_id, confirmed_qty, output_hu_code, output_zone, confirmed_by, notes)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		id, req.ConfirmedQty, req.OutputHUCode, req.OutputZone, userStr, req.Notes)
	if err != nil {
		logger.LogError("API", "PRODUCTION", "ConfirmOutput", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record output"})
		return
	}

	newActual := bo.ActualQty + req.ConfirmedQty
	updateQuery := "UPDATE build_orders SET actual_qty = $1"
	if newActual >= bo.PlannedQty {
		updateQuery += ", status = 'COMPLETED', actual_finish = NOW()"
	}
	updateQuery += " WHERE id = $2"
	_, err = tx.Exec(c.Request.Context(), updateQuery, newActual, id)

	checkYear := time.Now().Year()
	var seq int64
	err = tx.QueryRow(c.Request.Context(), "SELECT COALESCE(MAX(id), 0) + 1 FROM quality_checks").Scan(&seq)
	checkNum := fmt.Sprintf("QC-%d-%05d", checkYear, seq)

	_, err = tx.Exec(c.Request.Context(), `
		INSERT INTO quality_checks 
		(check_number, trigger_type, trigger_id, material_id, quantity_to_inspect, quantity_pending)
		VALUES ($1, 'PRODUCTION_OUTPUT', $2, $3, $4, $5)`,
		checkNum, id, bo.OutputMaterialID, req.ConfirmedQty, req.ConfirmedQty)

	if err != nil {
		logger.LogError("API", "PRODUCTION", "ConfirmOutput", "QC auto-create fail: "+err.Error())
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	logger.LogInfo("PRODUCTION", "ConfirmOutput", fmt.Sprintf("Build order output confirmed: number=%s qty=%f", bo.OrderNumber, req.ConfirmedQty))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BuildHandler) CancelBuildOrder(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var status string
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT status FROM build_orders WHERE id = $1", id).Scan(&status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if status != "DRAFT" && status != "RELEASED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only DRAFT or RELEASED orders can be cancelled"})
		return
	}

	_, err = h.Pool.Exec(c.Request.Context(), "UPDATE build_orders SET status = 'CANCELLED' WHERE id = $1", id)
	if err != nil {
		logger.LogError("API", "PRODUCTION", "CancelBuildOrder", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *BuildHandler) GetMaterialStatus(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT bc.sequence, p.name as material, bc.required_qty, bc.issued_qty, bc.issue_status
		FROM build_order_components bc
		LEFT JOIN products p ON bc.material_id = p.id
		WHERE bc.build_order_id = $1 ORDER BY bc.sequence`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch status"})
		return
	}
	defer rows.Close()

	var components []any
	allIssued := true
	anyIssued := false

	for rows.Next() {
		var seq int
		var mat string
		var req, iss float64
		var status string
		_ = rows.Scan(&seq, &mat, &req, &iss, &status)
		
		outstanding := req - iss
		if outstanding < 0 { outstanding = 0 }
		
		if status != "ISSUED" && status != "EXCESS" {
			allIssued = false
		}
		if iss > 0 {
			anyIssued = true
		}

		components = append(components, gin.H{
			"sequence":    seq,
			"material":    mat,
			"required":    req,
			"issued":      iss,
			"outstanding": outstanding,
			"status":      status,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"components":       components,
		"all_issued":       allIssued,
		"ready_to_produce": anyIssued,
	})
}
