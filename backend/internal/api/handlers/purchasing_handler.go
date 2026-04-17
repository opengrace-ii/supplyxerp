package handlers

import (
	"net/http"
	"strconv"
	"time"

	"supplyxerp/backend/internal/agent/purchasing"
	"supplyxerp/backend/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type PurchasingHandler struct {
	Repo  *repository.UnitOfWork
	Agent *purchasing.Agent
}

func NewPurchasingHandler(repo *repository.UnitOfWork, agent *purchasing.Agent) *PurchasingHandler {
	return &PurchasingHandler{Repo: repo, Agent: agent}
}

type CreatePRRequest struct {
	DocumentDate    string `json:"document_date"`
	PostingDate     string `json:"posting_date"`
	PurchasingGroup string `json:"purchasing_group"`
	CostCentre      string `json:"cost_centre"`
	Priority        string `json:"priority"`
	ReferenceDoc    string `json:"reference_doc"`
	Notes           string `json:"notes"`
	ProductID       any    `json:"product_id"` // Support flat request
	Quantity        float64 `json:"quantity"`
	Unit            string  `json:"unit"`
	Lines           []struct {
		ProductID             any     `json:"product_id"`
		Quantity              float64 `json:"quantity"`
		Unit                  string  `json:"unit"`
		EstimatedUnitPrice    float64 `json:"estimated_unit_price"`
		ShortText             string  `json:"short_text"`
		RequiredByDate        string  `json:"required_by_date"`
		PreferredSupplierID   any     `json:"preferred_supplier_id"`
		AccountAssignmentType string  `json:"account_assignment_type"`
		CostCentre            string  `json:"cost_centre"`
		LineNotes             string  `json:"line_notes"`
	} `json:"lines"`
}

func (h *PurchasingHandler) CreatePR(c *gin.Context) {
	var req CreatePRRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)

	docDate, _ := time.Parse("2006-01-02", req.DocumentDate)
	postDate, _ := time.Parse("2006-01-02", req.PostingDate)
	if docDate.IsZero() {
		docDate = time.Now()
	}
	if postDate.IsZero() {
		postDate = time.Now()
	}

	var rawLines []struct {
		ProductID             any
		Quantity              float64
		Unit                  string
		EstimatedUnitPrice    float64
		ShortText             string
		RequiredByDate        string
		PreferredSupplierID   any
		AccountAssignmentType string
		CostCentre            string
		LineNotes             string
	}

	if len(req.Lines) > 0 {
		for _, l := range req.Lines {
			rawLines = append(rawLines, struct {
				ProductID             any
				Quantity              float64
				Unit                  string
				EstimatedUnitPrice    float64
				ShortText             string
				RequiredByDate        string
				PreferredSupplierID   any
				AccountAssignmentType string
				CostCentre            string
				LineNotes             string
			}{
				ProductID:             l.ProductID,
				Quantity:              l.Quantity,
				Unit:                  l.Unit,
				EstimatedUnitPrice:    l.EstimatedUnitPrice,
				ShortText:             l.ShortText,
				RequiredByDate:        l.RequiredByDate,
				PreferredSupplierID:   l.PreferredSupplierID,
				AccountAssignmentType: l.AccountAssignmentType,
				CostCentre:            l.CostCentre,
				LineNotes:             l.LineNotes,
			})
		}
	} else if req.ProductID != nil && req.ProductID != "" {
		rawLines = append(rawLines, struct {
			ProductID             any
			Quantity              float64
			Unit                  string
			EstimatedUnitPrice    float64
			ShortText             string
			RequiredByDate        string
			PreferredSupplierID   any
			AccountAssignmentType string
			CostCentre            string
			LineNotes             string
		}{
			ProductID: req.ProductID,
			Quantity:  req.Quantity,
			Unit:      req.Unit,
		})
	}

	agentLines := make([]struct {
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
	}, len(rawLines))

	for i, l := range rawLines {
		reqDate, _ := time.Parse("2006-01-02", l.RequiredByDate)
		agentLines[i] = struct {
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
		}{
			ProductID:             h.resolveProductID(c, tenantID, l.ProductID),
			Quantity:              l.Quantity,
			Unit:                  l.Unit,
			EstimatedUnitPrice:    l.EstimatedUnitPrice,
			ShortText:             l.ShortText,
			RequiredByDate:        reqDate,
			PreferredSupplierID:   h.resolveID(l.PreferredSupplierID), // We don't have a public_id for supplier in query yet, assuming int for now or add resolution
			AccountAssignmentType: l.AccountAssignmentType,
			CostCentre:            l.CostCentre,
			LineNotes:             l.LineNotes,
		}
	}

	priority := req.Priority
	if priority == "" {
		priority = "NORMAL"
	}

	pr, err := h.Agent.CreatePR(c.Request.Context(), h.Repo, purchasing.CreatePRParams{
		TenantID:        tenantID,
		ActorID:         actorID,
		DocumentDate:    docDate,
		PostingDate:     postDate,
		PurchasingGroup: req.PurchasingGroup,
		CostCentre:      req.CostCentre,
		Priority:        priority,
		ReferenceDoc:    req.ReferenceDoc,
		Notes:           req.Notes,
		Lines:           agentLines,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, pr)
}

func (h *PurchasingHandler) ListPRs(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	status := c.Query("status")

	prs, err := h.Repo.Purchasing.ListPRs(c.Request.Context(), tenantID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list PRs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"purchase_requests": prs})
}

func (h *PurchasingHandler) GetPR(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	prID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	rows, err := h.Repo.Purchasing.GetPRDetail(c.Request.Context(), tenantID, prID)
	if err != nil || len(rows) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "PR not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"purchase_request": rows[0], // sqlc join rows have base fields
		"lines":            rows,
	})
}

func (h *PurchasingHandler) SubmitPR(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	prID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	err := h.Repo.Purchasing.UpdatePRStatus(c.Request.Context(), tenantID, prID, "SUBMITTED", 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit PR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PurchasingHandler) ApprovePR(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)
	prID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	err := h.Repo.Purchasing.UpdatePRStatus(c.Request.Context(), tenantID, prID, "APPROVED", actorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to approve PR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PurchasingHandler) RejectPR(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)
	prID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	err := h.Repo.Purchasing.UpdatePRStatus(c.Request.Context(), tenantID, prID, "REJECTED", actorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reject PR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PurchasingHandler) ConvertToPO(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)
	prID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		SupplierID int64 `json:"supplier_id"`
	}
	_ = c.ShouldBindJSON(&req)

	rows, err := h.Repo.Purchasing.GetPRDetail(c.Request.Context(), tenantID, prID)
	if err != nil || len(rows) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "PR not found"})
		return
	}

	pr := rows[0]
	if pr.Status != "APPROVED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only approved PRs can be converted"})
		return
	}

	supplierID := req.SupplierID
	if supplierID == 0 {
		supplierID = pr.PreferredSupplierID.Int64
	}
	if supplierID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Supplier ID is required for conversion"})
		return
	}

	poLines := make([]struct {
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
	}, len(rows))

	for i, rl := range rows {
		qty := repository.FloatFromNumeric(rl.Quantity)
		price := repository.FloatFromNumeric(rl.EstimatedPrice)
		poLines[i] = struct {
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
		}{
			ProductID:             rl.ProductID,
			Quantity:              qty,
			Unit:                  rl.Unit,
			UnitPrice:             price,
			ShortText:             rl.ProductCode + " " + rl.ProductName,
			DeliveryDate:          rl.RequiredByDate.Time,
			AccountAssignmentType: rl.AccountAssignmentType.String,
			CostCentre:            rl.CostCentreLine.String,
			LineNotes:             rl.LineNotes.String,
		}
	}

	po, err := h.Agent.CreatePO(c.Request.Context(), h.Repo, purchasing.CreatePOParams{
		TenantID:        tenantID,
		ActorID:         actorID,
		SupplierID:      supplierID,
		PRID:            prID,
		DocumentType:    "STANDARD",
		DocumentDate:    time.Now(),
		PostingDate:     time.Now(),
		Currency:        "GBP", // Default
		ExchangeRate:    1.0,
		Lines:           poLines,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, po)
}

type CreatePORequest struct {
	SupplierID        int64   `json:"supplier_id" binding:"required"`
	PrID              int64   `json:"pr_id"`
	DocumentType      string  `json:"document_type"`
	DocumentDate      string  `json:"document_date"`
	PostingDate       string  `json:"posting_date"`
	PurchasingOrg     string  `json:"purchasing_org"`
	PurchasingGroup   string  `json:"purchasing_group"`
	CompanyCode       string  `json:"company_code"`
	Currency          string  `json:"currency" binding:"required"`
	ExchangeRate      float64 `json:"exchange_rate"`
	PaymentTermsDays  int     `json:"payment_terms_days"`
	Incoterms         string  `json:"incoterms"`
	IncotermsLocation string  `json:"incoterms_location"`
	SupplierRef       string  `json:"supplier_ref"`
	DeliveryAddress   string  `json:"delivery_address"`
	Notes             string  `json:"notes"`
	Lines             []struct {
		ProductID                 int64   `json:"product_id"`
		Quantity                  float64 `json:"quantity"`
		Unit                      string  `json:"unit"`
		UnitPrice                 float64 `json:"unit_price"`
		ShortText                 string  `json:"short_text"`
		TaxCode                   string  `json:"tax_code"`
		DeliveryDate              string  `json:"delivery_date"`
		ReceivingZoneID           int64   `json:"receiving_zone_id"`
		OverdeliveryTolerancePct  float64 `json:"overdelivery_tolerance_pct"`
		UnderdeliveryTolerancePct float64 `json:"underdelivery_tolerance_pct"`
		AccountAssignmentType     string  `json:"account_assignment_type"`
		CostCentre                string  `json:"cost_centre"`
		LineNotes                 string  `json:"line_notes"`
	} `json:"lines" binding:"required"`
}

func (h *PurchasingHandler) CreatePO(c *gin.Context) {
	var req CreatePORequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)
	actorID := c.MustGet("user_id").(int64)

	docDate, _ := time.Parse("2006-01-02", req.DocumentDate)
	postDate, _ := time.Parse("2006-01-02", req.PostingDate)
	if docDate.IsZero() {
		docDate = time.Now()
	}
	if postDate.IsZero() {
		postDate = time.Now()
	}

	agentLines := make([]struct {
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
	}, len(req.Lines))

	docType := req.DocumentType
	if docType == "" {
		docType = "STANDARD"
	}

	for i, l := range req.Lines {
		delivDate, _ := time.Parse("2006-01-02", l.DeliveryDate)
		agentLines[i] = struct {
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
		}{
			ProductID:                 l.ProductID,
			Quantity:                  l.Quantity,
			Unit:                      l.Unit,
			UnitPrice:                 l.UnitPrice,
			ShortText:                 l.ShortText,
			TaxCode:                   l.TaxCode,
			DeliveryDate:              delivDate,
			ReceivingZoneID:           l.ReceivingZoneID,
			OverdeliveryTolerancePct:  l.OverdeliveryTolerancePct,
			UnderdeliveryTolerancePct: l.UnderdeliveryTolerancePct,
			AccountAssignmentType:     l.AccountAssignmentType,
			CostCentre:                l.CostCentre,
			LineNotes:                 l.LineNotes,
		}
	}

	po, err := h.Agent.CreatePO(c.Request.Context(), h.Repo, purchasing.CreatePOParams{
		TenantID:          tenantID,
		ActorID:           actorID,
		SupplierID:        req.SupplierID,
		PRID:              req.PrID,
		DocumentType:      docType,
		DocumentDate:      docDate,
		PostingDate:       postDate,
		PurchasingOrg:     req.PurchasingOrg,
		PurchasingGroup:   req.PurchasingGroup,
		CompanyCode:       req.CompanyCode,
		Currency:          req.Currency,
		ExchangeRate:      req.ExchangeRate,
		PaymentTermsDays:  req.PaymentTermsDays,
		Incoterms:         req.Incoterms,
		IncotermsLocation: req.IncotermsLocation,
		SupplierRef:       req.SupplierRef,
		DeliveryAddress:   req.DeliveryAddress,
		Notes:             req.Notes,
		Lines:             agentLines,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, po)
}

func (h *PurchasingHandler) ListPOs(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	status := c.Query("status")

	pos, err := h.Repo.Purchasing.ListPOs(c.Request.Context(), tenantID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list POs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"purchase_orders": pos})
}

func (h *PurchasingHandler) GetPO(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	poID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	rows, err := h.Repo.Purchasing.GetPODetail(c.Request.Context(), tenantID, poID)
	if err != nil || len(rows) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "PO not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"purchase_order": rows[0],
		"lines":          rows,
	})
}

func (h *PurchasingHandler) SubmitPO(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	poID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	err := h.Repo.Purchasing.UpdatePOStatus(c.Request.Context(), tenantID, poID, "SUBMITTED")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to submit PO"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PurchasingHandler) ApprovePO(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	poID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	err := h.Repo.Purchasing.UpdatePOStatus(c.Request.Context(), tenantID, poID, "APPROVED")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to approve PO"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PurchasingHandler) RejectPO(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	poID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	err := h.Repo.Purchasing.UpdatePOStatus(c.Request.Context(), tenantID, poID, "REJECTED")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reject PO"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *PurchasingHandler) resolveProductID(c *gin.Context, tenantID int64, val any) int64 {
	switch v := val.(type) {
	case float64:
		return int64(v)
	case string:
		if v == "" {
			return 0
		}
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			return id
		}
		var uuid pgtype.UUID
		if err := uuid.Scan(v); err == nil {
			prod, err := h.Repo.Products.GetByPublicID(c.Request.Context(), tenantID, uuid)
			if err == nil {
				return prod.ID
			}
		}
	}
	return 0
}

func (h *PurchasingHandler) resolveID(val any) int64 {
	switch v := val.(type) {
	case float64:
		return int64(v)
	case string:
		if id, err := strconv.ParseInt(v, 10, 64); err == nil {
			return id
		}
	}
	return 0
}
