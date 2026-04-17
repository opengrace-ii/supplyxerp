package handlers

import (
	"net/http"
	"strconv"

	"supplyxerp/backend/internal/repository"
	"supplyxerp/backend/internal/db/dbgen"
	"github.com/gin-gonic/gin"
)

type SupplierHandler struct {
	Repo *repository.UnitOfWork
}

func NewSupplierHandler(repo *repository.UnitOfWork) *SupplierHandler {
	return &SupplierHandler{Repo: repo}
}

func (h *SupplierHandler) List(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	suppliers, err := h.Repo.Suppliers.List(c.Request.Context(), tenantID, int32(limit), int32(offset))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list suppliers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"suppliers": suppliers})
}

type CreateSupplierRequest struct {
	Code              string  `json:"code" binding:"required"`
	Name              string  `json:"name" binding:"required"`
	ContactName       string  `json:"contact_name"`
	Email             string  `json:"email"`
	Phone             string  `json:"phone"`
	AddressLine1      string  `json:"address_line1"`
	AddressLine2      string  `json:"address_line2"`
	City              string  `json:"city"`
	Country           string  `json:"country"`
	PostalCode        string  `json:"postal_code"`
	TaxNumber         string  `json:"tax_number"`
	BankName          string  `json:"bank_name"`
	BankAccount       string  `json:"bank_account"`
	BankSortCode      string  `json:"bank_sort_code"`
	Incoterms         string  `json:"incoterms"`
	IncotermsLocation string  `json:"incoterms_location"`
	PreferredCurrency string  `json:"preferred_currency"`
	CreditLimit       float64 `json:"credit_limit"`
	SupplierGroup     string  `json:"supplier_group"`
	Rating            string  `json:"rating"`
	Website           string  `json:"website"`
	Currency          string  `json:"currency"`
	PaymentTermsDays  int     `json:"payment_terms_days"`
	Notes             string  `json:"notes"`
}

func (h *SupplierHandler) Create(c *gin.Context) {
	var req CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)

	supplier, err := h.Repo.Suppliers.Create(c.Request.Context(), dbgen.Supplier{
		TenantID:          tenantID,
		Code:              req.Code,
		Name:              req.Name,
		ContactName:       stringToText(req.ContactName),
		Email:             stringToText(req.Email),
		Phone:             stringToText(req.Phone),
		AddressLine1:      stringToText(req.AddressLine1),
		AddressLine2:      stringToText(req.AddressLine2),
		City:              stringToText(req.City),
		Country:           stringToText(req.Country),
		PostalCode:        stringToText(req.PostalCode),
		TaxNumber:         stringToText(req.TaxNumber),
		BankName:          stringToText(req.BankName),
		BankAccount:       stringToText(req.BankAccount),
		BankSortCode:      stringToText(req.BankSortCode),
		Incoterms:         stringToText(req.Incoterms),
		IncotermsLocation: stringToText(req.IncotermsLocation),
		PreferredCurrency: stringToText(req.PreferredCurrency),
		CreditLimit:       numericFromFloat(req.CreditLimit),
		SupplierGroup:     stringToText(req.SupplierGroup),
		Rating:            stringToText(req.Rating),
		Website:           stringToText(req.Website),
		Currency:          req.Currency,
		PaymentTermsDays:  int32(req.PaymentTermsDays),
		Notes:             stringToText(req.Notes),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create supplier"})
		return
	}

	c.JSON(http.StatusCreated, supplier)
}

func (h *SupplierHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := c.MustGet("tenant_id").(int64)

	supplier, err := h.Repo.Suppliers.Update(c.Request.Context(), dbgen.Supplier{
		TenantID:          tenantID,
		ID:                id,
		Name:              req.Name,
		ContactName:       stringToText(req.ContactName),
		Email:             stringToText(req.Email),
		Phone:             stringToText(req.Phone),
		AddressLine1:      stringToText(req.AddressLine1),
		AddressLine2:      stringToText(req.AddressLine2),
		City:              stringToText(req.City),
		Country:           stringToText(req.Country),
		PostalCode:        stringToText(req.PostalCode),
		TaxNumber:         stringToText(req.TaxNumber),
		BankName:          stringToText(req.BankName),
		BankAccount:       stringToText(req.BankAccount),
		BankSortCode:      stringToText(req.BankSortCode),
		Incoterms:         stringToText(req.Incoterms),
		IncotermsLocation: stringToText(req.IncotermsLocation),
		PreferredCurrency: stringToText(req.PreferredCurrency),
		CreditLimit:       numericFromFloat(req.CreditLimit),
		SupplierGroup:     stringToText(req.SupplierGroup),
		Rating:            stringToText(req.Rating),
		Website:           stringToText(req.Website),
		Currency:          req.Currency,
		PaymentTermsDays:  int32(req.PaymentTermsDays),
		Notes:             stringToText(req.Notes),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update supplier"})
		return
	}

	c.JSON(http.StatusOK, supplier)
}

func (h *SupplierHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	tenantID := c.MustGet("tenant_id").(int64)

	err := h.Repo.Suppliers.Deactivate(c.Request.Context(), tenantID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete supplier"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
