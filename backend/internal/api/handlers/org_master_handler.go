package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrgMasterHandler struct {
	Pool *pgxpool.Pool
}

func NewOrgMasterHandler(pool *pgxpool.Pool) *OrgMasterHandler {
	return &OrgMasterHandler{Pool: pool}
}

// ================================================================
// TENANT PROFILE
// ================================================================

func (h *OrgMasterHandler) GetTenantProfile(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	row := h.Pool.QueryRow(c.Request.Context(), `
		SELECT id, public_id, name, slug,
		  COALESCE(legal_name,''), COALESCE(registration_no,''), COALESCE(tax_id,''),
		  COALESCE(tax_regime,''), COALESCE(country_code,'IN'), COALESCE(currency_code,'INR'),
		  COALESCE(address_line1,''), COALESCE(address_line2,''), COALESCE(city,''),
		  COALESCE(state_province,''), COALESCE(postal_code,''), COALESCE(phone,''),
		  COALESCE(email,''), COALESCE(website,''), COALESCE(logo_url,''),
		  COALESCE(fiscal_year_start,4), COALESCE(date_format,'DD/MM/YYYY'),
		  COALESCE(time_zone,'Asia/Kolkata'), COALESCE(language_code,'en'),
		  COALESCE(is_active,true), created_at,
		  COALESCE(custom_attributes,'{}')::text
		FROM tenants WHERE id = $1`, tenantID)

	var t struct {
		ID, FiscalYearStart                               int64
		PublicID, Name, Slug                              string
		LegalName, RegistrationNo, TaxID, TaxRegime      string
		CountryCode, CurrencyCode                         string
		Address1, Address2, City, State, Postal           string
		Phone, Email, Website, LogoURL                    string
		DateFormat, TimeZone, LanguageCode                string
		IsActive                                          bool
		CreatedAt                                         time.Time
		CustomAttributes                                  string
	}
	if err := row.Scan(&t.ID, &t.PublicID, &t.Name, &t.Slug,
		&t.LegalName, &t.RegistrationNo, &t.TaxID, &t.TaxRegime,
		&t.CountryCode, &t.CurrencyCode,
		&t.Address1, &t.Address2, &t.City, &t.State, &t.Postal,
		&t.Phone, &t.Email, &t.Website, &t.LogoURL,
		&t.FiscalYearStart, &t.DateFormat, &t.TimeZone, &t.LanguageCode,
		&t.IsActive, &t.CreatedAt, &t.CustomAttributes); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id": t.ID, "public_id": t.PublicID, "name": t.Name, "slug": t.Slug,
		"legal_name": t.LegalName, "registration_no": t.RegistrationNo,
		"tax_id": t.TaxID, "tax_regime": t.TaxRegime,
		"country_code": t.CountryCode, "currency_code": t.CurrencyCode,
		"address_line1": t.Address1, "address_line2": t.Address2,
		"city": t.City, "state_province": t.State, "postal_code": t.Postal,
		"phone": t.Phone, "email": t.Email, "website": t.Website, "logo_url": t.LogoURL,
		"fiscal_year_start": t.FiscalYearStart, "date_format": t.DateFormat,
		"time_zone": t.TimeZone, "language_code": t.LanguageCode,
		"is_active": t.IsActive, "created_at": t.CreatedAt,
		"custom_attributes": t.CustomAttributes,
	})
}

func (h *OrgMasterHandler) UpdateTenantProfile(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	allowed := []string{"legal_name", "registration_no", "tax_id", "tax_regime",
		"country_code", "currency_code", "address_line1", "address_line2",
		"city", "state_province", "postal_code", "phone", "email", "website",
		"logo_url", "fiscal_year_start", "date_format", "time_zone", "language_code",
		"custom_attributes"}
	setClauses, args := buildUpdateSet(req, allowed, tenantID)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
		return
	}
	args = append(args, tenantID)
	query := fmt.Sprintf("UPDATE tenants SET %s, updated_at = NOW() WHERE id = $%d", setClauses, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ================================================================
// COMPANIES
// ================================================================

func (h *OrgMasterHandler) ListCompanies(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT co.id, co.public_id, co.code, co.name, co.legal_name, co.tax_id,
		  co.tax_regime, co.country_code, co.currency_code, co.city, co.is_active,
		  co.created_at,
		  (SELECT COUNT(*) FROM sites s WHERE s.company_id = co.id AND s.is_active = true) as site_count
		FROM companies co
		WHERE co.tenant_id = $1
		ORDER BY co.code ASC`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id, siteCount int64
		var pubID, code, name, country, currency string
		var legalName, taxID, taxRegime, city *string
		var isActive bool
		var createdAt time.Time
		if err := rows.Scan(&id, &pubID, &code, &name, &legalName, &taxID,
			&taxRegime, &country, &currency, &city, &isActive, &createdAt, &siteCount); err != nil {
			continue
		}
		result = append(result, gin.H{
			"id": id, "public_id": pubID, "code": code, "name": name,
			"legal_name": legalName, "tax_id": taxID, "tax_regime": taxRegime,
			"country_code": country, "currency_code": currency, "city": city,
			"is_active": isActive, "created_at": createdAt, "site_count": siteCount,
		})
	}
	c.JSON(http.StatusOK, gin.H{"companies": result})
}

func (h *OrgMasterHandler) CreateCompany(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		Code             string `json:"code" binding:"required"`
		Name             string `json:"name" binding:"required"`
		LegalName        string `json:"legal_name"`
		RegistrationNo   string `json:"registration_no"`
		TaxID            string `json:"tax_id"`
		TaxRegime        string `json:"tax_regime"`
		CountryCode      string `json:"country_code" binding:"required"`
		CurrencyCode     string `json:"currency_code" binding:"required"`
		AddressLine1     string `json:"address_line1"`
		City             string `json:"city"`
		StateProvince    string `json:"state_province"`
		PostalCode       string `json:"postal_code"`
		Phone            string `json:"phone"`
		Email            string `json:"email"`
		FiscalYearStart  int    `json:"fiscal_year_start"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.FiscalYearStart == 0 {
		req.FiscalYearStart = 4
	}
	var id int64
	var pubID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO companies (tenant_id, code, name, legal_name, registration_no, tax_id, tax_regime,
		  country_code, currency_code, address_line1, city, state_province, postal_code,
		  phone, email, fiscal_year_start)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING id, public_id`,
		tenantID, req.Code, req.Name, nullStr(req.LegalName), nullStr(req.RegistrationNo),
		nullStr(req.TaxID), nullStr(req.TaxRegime), req.CountryCode, req.CurrencyCode,
		nullStr(req.AddressLine1), nullStr(req.City), nullStr(req.StateProvince),
		nullStr(req.PostalCode), nullStr(req.Phone), nullStr(req.Email), req.FiscalYearStart,
	).Scan(&id, &pubID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create company (duplicate code?): " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "public_id": pubID, "code": req.Code})
}

func (h *OrgMasterHandler) UpdateCompany(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Check: cannot deactivate if active sites assigned
	if active, ok := req["is_active"]; ok && active == false {
		var cnt int
		h.Pool.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM sites WHERE company_id = $1 AND is_active = true`, id).Scan(&cnt)
		if cnt > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("%d active sites assigned. Reassign before deactivating.", cnt)})
			return
		}
	}
	allowed := []string{"name", "legal_name", "registration_no", "tax_id", "tax_regime",
		"country_code", "currency_code", "address_line1", "address_line2", "city",
		"state_province", "postal_code", "phone", "email", "fiscal_year_start", "is_active", "custom_attributes"}
	setClauses, args := buildUpdateSet(req, allowed, id)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields"})
		return
	}
	args = append(args, tenantID, id)
	query := fmt.Sprintf("UPDATE companies SET %s, updated_at = NOW() WHERE tenant_id = $%d AND id = $%d", setClauses, len(args)-1, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ================================================================
// SITES
// ================================================================

func (h *OrgMasterHandler) ListSites(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT s.id, s.public_id, s.code, s.name, s.is_active,
		  COALESCE(s.site_type,'WAREHOUSE'), COALESCE(s.site_purpose,''),
		  COALESCE(s.country_code,''), COALESCE(s.city,''),
		  s.company_id, COALESCE(co.name,'') as company_name,
		  s.calendar_id, COALESCE(cal.name,'') as calendar_name,
		  (SELECT COUNT(*) FROM zones z WHERE z.site_id = s.id AND z.is_active = true) as zone_count
		FROM sites s
		LEFT JOIN companies co ON s.company_id = co.id
		LEFT JOIN operational_calendars cal ON s.calendar_id = cal.id
		WHERE s.tenant_id = $1 AND s.is_active = true
		ORDER BY s.code ASC`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error: " + err.Error()})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id, zoneCount int64
		var companyID, calendarID *int64
		var pubID, code, name, siteType, purpose, country, city, companyName, calName string
		var isActive bool
		if err := rows.Scan(&id, &pubID, &code, &name, &isActive, &siteType, &purpose,
			&country, &city, &companyID, &companyName, &calendarID, &calName, &zoneCount); err != nil {
			continue
		}
		result = append(result, gin.H{
			"id": id, "public_id": pubID, "code": code, "name": name, "is_active": isActive,
			"site_type": siteType, "site_purpose": purpose, "country_code": country, "city": city,
			"company_id": companyID, "company_name": companyName,
			"calendar_id": calendarID, "calendar_name": calName, "zone_count": zoneCount,
		})
	}
	c.JSON(http.StatusOK, gin.H{"sites": result})
}

func (h *OrgMasterHandler) CreateSite(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		Code                      string  `json:"code" binding:"required"`
		Name                      string  `json:"name" binding:"required"`
		CompanyID                 int64   `json:"company_id" binding:"required"`
		SiteType                  string  `json:"site_type"`
		SitePurpose               string  `json:"site_purpose"`
		CountryCode               string  `json:"country_code"`
		AddressLine1              string  `json:"address_line1"`
		City                      string  `json:"city"`
		StateProvince             string  `json:"state_province"`
		PostalCode                string  `json:"postal_code"`
		CalendarID                *int64  `json:"calendar_id"`
		ValuationLevel            string  `json:"valuation_level"`
		AllowsNegativeStock       bool    `json:"allows_negative_stock"`
		GoodsReceiptZoneRequired  bool    `json:"goods_receipt_zone_required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.SiteType == "" { req.SiteType = "WAREHOUSE" }
	if req.ValuationLevel == "" { req.ValuationLevel = "SITE" }

	// Verify company belongs to tenant
	var compExists bool
	h.Pool.QueryRow(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM companies WHERE id=$1 AND tenant_id=$2 AND is_active=true)`, req.CompanyID, tenantID).Scan(&compExists)
	if !compExists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company_id"})
		return
	}

	// Legacy org: use first org for the tenant (sites table still requires it)
	var orgID int64
	h.Pool.QueryRow(c.Request.Context(), `SELECT id FROM organisations WHERE tenant_id=$1 ORDER BY id ASC LIMIT 1`, tenantID).Scan(&orgID)
	if orgID == 0 {
		// Create a placeholder org row if none exists
		h.Pool.QueryRow(c.Request.Context(), `INSERT INTO organisations (tenant_id, name, legal_name, currency, fiscal_year_start) VALUES ($1,'Default Org',NULL,'GBP',4) RETURNING id`, tenantID).Scan(&orgID)
	}

	tx, _ := h.Pool.Begin(c.Request.Context())
	defer tx.Rollback(c.Request.Context())

	var id int64; var pubID string
	err := tx.QueryRow(c.Request.Context(), `
		INSERT INTO sites (tenant_id, organisation_id, code, name, timezone, company_id,
		  site_type, site_purpose, country_code, address_line1, city, state_province, postal_code,
		  calendar_id, valuation_level, allows_negative_stock, goods_receipt_zone_required)
		VALUES ($1,$2,$3,$4,'UTC',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING id, public_id`,
		tenantID, orgID, req.Code, req.Name, req.CompanyID,
		req.SiteType, nullStr(req.SitePurpose), nullStr(req.CountryCode),
		nullStr(req.AddressLine1), nullStr(req.City), nullStr(req.StateProvince), nullStr(req.PostalCode),
		req.CalendarID, req.ValuationLevel, req.AllowsNegativeStock, req.GoodsReceiptZoneRequired,
	).Scan(&id, &pubID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create site: " + err.Error()})
		return
	}

	// Auto-create default zones
	defaultZones := [][]string{{"RECV-01","Receiving Bay","RECEIVING"},{"STOR-01","Main Storage","STORAGE"},{"DISP-01","Dispatch Area","DISPATCH"}}
	for _, z := range defaultZones {
		tx.Exec(c.Request.Context(), `INSERT INTO zones (tenant_id, site_id, code, name, zone_type) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, tenantID, id, z[0], z[1], z[2])
	}
	tx.Commit(c.Request.Context())
	c.JSON(http.StatusCreated, gin.H{"id": id, "public_id": pubID, "code": req.Code})
}

func (h *OrgMasterHandler) UpdateSite(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	allowed := []string{"name", "company_id", "site_type", "site_purpose", "country_code",
		"address_line1", "address_line2", "city", "state_province", "postal_code",
		"phone", "email", "calendar_id", "valuation_level", "allows_negative_stock",
		"goods_receipt_zone_required", "is_active", "custom_attributes"}
	setClauses, args := buildUpdateSet(req, allowed, id)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields"})
		return
	}
	args = append(args, tenantID, id)
	query := fmt.Sprintf("UPDATE sites SET %s, updated_at = NOW() WHERE tenant_id = $%d AND id = $%d", setClauses, len(args)-1, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OrgMasterHandler) ListSiteZones(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	siteID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT z.id, z.public_id, z.code, z.name, z.zone_type, z.is_active,
		  COALESCE(z.is_quarantine,false), COALESCE(z.is_inspection,false),
		  z.storage_area_id, COALESCE(sa.name,'') as area_name
		FROM zones z
		LEFT JOIN storage_areas sa ON z.storage_area_id = sa.id
		WHERE z.site_id = $1 AND z.tenant_id = $2
		ORDER BY z.code ASC`, siteID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64; var pubID, code, name, zType, areaName string
		var isActive, isQ, isI bool; var areaID *int64
		if err := rows.Scan(&id, &pubID, &code, &name, &zType, &isActive, &isQ, &isI, &areaID, &areaName); err != nil { continue }
		result = append(result, gin.H{
			"id": id, "public_id": pubID, "code": code, "name": name,
			"zone_type": zType, "is_active": isActive, "is_quarantine": isQ,
			"is_inspection": isI, "storage_area_id": areaID, "area_name": areaName,
		})
	}
	c.JSON(http.StatusOK, gin.H{"zones": result})
}

// ================================================================
// STORAGE AREAS
// ================================================================

func (h *OrgMasterHandler) ListStorageAreas(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	siteID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, public_id, code, name, area_type, COALESCE(floor_level,''),
		  is_active, created_at
		FROM storage_areas WHERE site_id=$1 AND tenant_id=$2 ORDER BY code ASC`, siteID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64; var pubID, code, name, aType, floor string; var isActive bool; var createdAt time.Time
		if err := rows.Scan(&id, &pubID, &code, &name, &aType, &floor, &isActive, &createdAt); err != nil { continue }
		result = append(result, gin.H{
			"id": id, "public_id": pubID, "code": code, "name": name,
			"area_type": aType, "floor_level": floor, "is_active": isActive, "created_at": createdAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"areas": result})
}

func (h *OrgMasterHandler) CreateStorageArea(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	siteID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Code         string  `json:"code" binding:"required"`
		Name         string  `json:"name" binding:"required"`
		AreaType     string  `json:"area_type"`
		FloorLevel   string  `json:"floor_level"`
		MaxCapacity  float64 `json:"max_capacity"`
		CapacityUnit string  `json:"capacity_unit"`
		Description  string  `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.AreaType == "" { req.AreaType = "GENERAL" }
	var id int64; var pubID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO storage_areas (tenant_id, site_id, code, name, area_type, floor_level, description)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, public_id`,
		tenantID, siteID, req.Code, req.Name, req.AreaType, nullStr(req.FloorLevel), nullStr(req.Description),
	).Scan(&id, &pubID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create area: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "public_id": pubID, "code": req.Code})
}

func (h *OrgMasterHandler) UpdateStorageArea(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	allowed := []string{"name", "area_type", "floor_level", "max_capacity", "capacity_unit", "description", "is_active", "custom_attributes"}
	setClauses, args := buildUpdateSet(req, allowed, id)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields"})
		return
	}
	args = append(args, tenantID, id)
	query := fmt.Sprintf("UPDATE storage_areas SET %s, updated_at = NOW() WHERE tenant_id=$%d AND id=$%d", setClauses, len(args)-1, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ================================================================
// ZONES (new org-master endpoints)
// ================================================================

func (h *OrgMasterHandler) CreateZoneForSite(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	siteID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Code           string  `json:"code" binding:"required"`
		Name           string  `json:"name" binding:"required"`
		ZoneType       string  `json:"zone_type" binding:"required"`
		StorageAreaID  *int64  `json:"storage_area_id"`
		Barcode        string  `json:"barcode"`
		MaxWeightKg    float64 `json:"max_weight_kg"`
		MaxVolumeM3    float64 `json:"max_volume_m3"`
		TempMin        float64 `json:"temperature_min"`
		TempMax        float64 `json:"temperature_max"`
		IsQuarantine   bool    `json:"is_quarantine"`
		IsInspection   bool    `json:"is_inspection"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var id int64; var pubID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO zones (tenant_id, site_id, code, name, zone_type, storage_area_id,
		  barcode, is_quarantine, is_inspection)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, public_id`,
		tenantID, siteID, req.Code, req.Name, req.ZoneType, req.StorageAreaID,
		nullStr(req.Barcode), req.IsQuarantine, req.IsInspection,
	).Scan(&id, &pubID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create zone: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "public_id": pubID, "code": req.Code})
}

func (h *OrgMasterHandler) UpdateZone(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	allowed := []string{"name", "zone_type", "storage_area_id", "barcode",
		"max_weight_kg", "max_volume_m3", "temperature_min", "temperature_max",
		"is_quarantine", "is_inspection", "is_active", "custom_attributes"}
	setClauses, args := buildUpdateSet(req, allowed, id)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields"})
		return
	}
	args = append(args, tenantID, id)
	query := fmt.Sprintf("UPDATE zones SET %s, updated_at = NOW() WHERE tenant_id=$%d AND id=$%d", setClauses, len(args)-1, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ================================================================
// OPERATIONAL CALENDARS
// ================================================================

func (h *OrgMasterHandler) ListCalendars(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT cal.id, cal.public_id, cal.code, cal.name, COALESCE(cal.country_code,''),
		  cal.work_monday, cal.work_tuesday, cal.work_wednesday,
		  cal.work_thursday, cal.work_friday, cal.work_saturday, cal.work_sunday,
		  cal.daily_work_hours, cal.valid_from_year, cal.valid_to_year, cal.is_active,
		  (SELECT COUNT(*) FROM calendar_exceptions ce WHERE ce.calendar_id = cal.id) as exception_count
		FROM operational_calendars cal WHERE cal.tenant_id=$1 ORDER BY cal.code ASC`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id, fromYear, toYear, excCount int64
		var pubID, code, name, country string
		var mon, tue, wed, thu, fri, sat, sun, isActive bool
		var dailyHours float64
		if err := rows.Scan(&id, &pubID, &code, &name, &country,
			&mon, &tue, &wed, &thu, &fri, &sat, &sun,
			&dailyHours, &fromYear, &toYear, &isActive, &excCount); err != nil { continue }
		result = append(result, gin.H{
			"id": id, "public_id": pubID, "code": code, "name": name, "country_code": country,
			"work_monday": mon, "work_tuesday": tue, "work_wednesday": wed,
			"work_thursday": thu, "work_friday": fri, "work_saturday": sat, "work_sunday": sun,
			"daily_work_hours": dailyHours, "valid_from_year": fromYear, "valid_to_year": toYear,
			"is_active": isActive, "exception_count": excCount,
		})
	}
	c.JSON(http.StatusOK, gin.H{"calendars": result})
}

func (h *OrgMasterHandler) CreateCalendar(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		Code           string  `json:"code" binding:"required"`
		Name           string  `json:"name" binding:"required"`
		CountryCode    string  `json:"country_code"`
		ValidFromYear  int     `json:"valid_from_year"`
		ValidToYear    int     `json:"valid_to_year"`
		WorkMonday     bool    `json:"work_monday"`
		WorkTuesday    bool    `json:"work_tuesday"`
		WorkWednesday  bool    `json:"work_wednesday"`
		WorkThursday   bool    `json:"work_thursday"`
		WorkFriday     bool    `json:"work_friday"`
		WorkSaturday   bool    `json:"work_saturday"`
		WorkSunday     bool    `json:"work_sunday"`
		DailyWorkHours float64 `json:"daily_work_hours"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.ValidFromYear == 0 { req.ValidFromYear = 2024 }
	if req.ValidToYear == 0 { req.ValidToYear = 2035 }
	if req.DailyWorkHours == 0 { req.DailyWorkHours = 8.0 }
	var id int64; var pubID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO operational_calendars (tenant_id, code, name, country_code,
		  valid_from_year, valid_to_year, work_monday, work_tuesday, work_wednesday,
		  work_thursday, work_friday, work_saturday, work_sunday, daily_work_hours)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id, public_id`,
		tenantID, req.Code, req.Name, nullStr(req.CountryCode),
		req.ValidFromYear, req.ValidToYear,
		req.WorkMonday, req.WorkTuesday, req.WorkWednesday, req.WorkThursday,
		req.WorkFriday, req.WorkSaturday, req.WorkSunday, req.DailyWorkHours,
	).Scan(&id, &pubID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create calendar: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "public_id": pubID, "code": req.Code})
}

func (h *OrgMasterHandler) UpdateCalendar(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	allowed := []string{"name", "country_code", "valid_from_year", "valid_to_year",
		"work_monday", "work_tuesday", "work_wednesday", "work_thursday",
		"work_friday", "work_saturday", "work_sunday", "daily_work_hours", "is_active"}
	setClauses, args := buildUpdateSet(req, allowed, id)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields"})
		return
	}
	args = append(args, tenantID, id)
	query := fmt.Sprintf("UPDATE operational_calendars SET %s, updated_at = NOW() WHERE tenant_id=$%d AND id=$%d", setClauses, len(args)-1, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OrgMasterHandler) AddCalendarException(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	calID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		ExceptionDate string `json:"exception_date" binding:"required"`
		ExceptionType string `json:"exception_type" binding:"required"`
		Description   string `json:"description" binding:"required"`
		IsWorkingDay  bool   `json:"is_working_day"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO calendar_exceptions (tenant_id, calendar_id, exception_date, exception_type, description, is_working_day)
		VALUES ($1,$2,$3::date,$4,$5,$6)
		ON CONFLICT (tenant_id, calendar_id, exception_date) DO UPDATE
		  SET exception_type=$4, description=$5, is_working_day=$6`,
		tenantID, calID, req.ExceptionDate, req.ExceptionType, req.Description, req.IsWorkingDay)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add exception: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func (h *OrgMasterHandler) DeleteCalendarException(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	calID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	dateStr := c.Param("date")
	_, err := h.Pool.Exec(c.Request.Context(), `
		DELETE FROM calendar_exceptions WHERE tenant_id=$1 AND calendar_id=$2 AND exception_date=$3::date`,
		tenantID, calID, dateStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Delete failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OrgMasterHandler) GetWorkingDays(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	calID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	fromStr := c.Query("from_date")
	toStr := c.Query("to_date")
	fromDate, err1 := time.Parse("2006-01-02", fromStr)
	toDate, err2 := time.Parse("2006-01-02", toStr)
	if err1 != nil || err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}
	// Fetch calendar workdays pattern
	var mon, tue, wed, thu, fri, sat, sun bool
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT work_monday, work_tuesday, work_wednesday, work_thursday, work_friday,
		  work_saturday, work_sunday FROM operational_calendars WHERE id=$1 AND tenant_id=$2`,
		calID, tenantID).Scan(&mon, &tue, &wed, &thu, &fri, &sat, &sun)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Calendar not found"})
		return
	}
	workDays := [7]bool{sun, mon, tue, wed, thu, fri, sat}

	// Fetch holiday exceptions (is_working_day=false) in range
	rows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT exception_date, description, is_working_day FROM calendar_exceptions
		WHERE calendar_id=$1 AND tenant_id=$2 AND exception_date BETWEEN $3 AND $4`,
		calID, tenantID, fromDate, toDate)
	defer rows.Close()
	exceptions := map[string]bool{}
	holidays := []gin.H{}
	for rows.Next() {
		var d time.Time; var desc string; var isWork bool
		if err := rows.Scan(&d, &desc, &isWork); err != nil { continue }
		ds := d.Format("2006-01-02")
		exceptions[ds] = isWork
		if !isWork {
			holidays = append(holidays, gin.H{"date": ds, "description": desc})
		}
	}

	// Calculate working days
	working := 0
	calendarDays := 0
	for d := fromDate; !d.After(toDate); d = d.AddDate(0, 0, 1) {
		calendarDays++
		ds := d.Format("2006-01-02")
		if override, ok := exceptions[ds]; ok {
			if override { working++ }
		} else if workDays[d.Weekday()] {
			working++
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"working_days": working, "calendar_days": calendarDays,
		"holidays": holidays, "from_date": fromStr, "to_date": toStr,
	})
}

// ================================================================
// PROCUREMENT UNITS
// ================================================================

func (h *OrgMasterHandler) ListProcurementUnits(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT pu.id, pu.public_id, pu.code, pu.name, pu.scope_type,
		  pu.currency_code, pu.is_active, pu.created_at,
		  COALESCE(co.name,'') as company_name,
		  (SELECT COUNT(*) FROM procurement_unit_sites pus WHERE pus.procurement_unit_id = pu.id) as site_count
		FROM procurement_units pu
		LEFT JOIN companies co ON pu.company_id = co.id
		WHERE pu.tenant_id=$1 ORDER BY pu.code ASC`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id, siteCount int64
		var pubID, code, name, scope, companyName string
		var currCode *string; var isActive bool; var createdAt time.Time
		if err := rows.Scan(&id, &pubID, &code, &name, &scope, &currCode, &isActive, &createdAt, &companyName, &siteCount); err != nil { continue }
		result = append(result, gin.H{
			"id": id, "public_id": pubID, "code": code, "name": name, "scope_type": scope,
			"currency_code": currCode, "is_active": isActive, "created_at": createdAt,
			"company_name": companyName, "site_count": siteCount,
		})
	}
	c.JSON(http.StatusOK, gin.H{"procurement_units": result})
}

func (h *OrgMasterHandler) CreateProcurementUnit(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		Code                    string  `json:"code" binding:"required"`
		Name                    string  `json:"name" binding:"required"`
		ScopeType               string  `json:"scope_type"`
		CompanyID               *int64  `json:"company_id"`
		ReferenceUnitID         *int64  `json:"reference_unit_id"`
		CanReleaseOrders        bool    `json:"can_release_orders"`
		UseReferenceConditions  bool    `json:"use_reference_conditions"`
		CurrencyCode            string  `json:"currency_code"`
		Phone                   string  `json:"phone"`
		Email                   string  `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.ScopeType == "" { req.ScopeType = "SITE_SPECIFIC" }
	if req.ScopeType == "SITE_SPECIFIC" && req.CompanyID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "company_id is required for SITE_SPECIFIC scope"})
		return
	}
	var id int64; var pubID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO procurement_units (tenant_id, code, name, scope_type, company_id,
		  reference_unit_id, can_release_orders, use_reference_conditions,
		  currency_code, phone, email)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, public_id`,
		tenantID, req.Code, req.Name, req.ScopeType, req.CompanyID,
		req.ReferenceUnitID, req.CanReleaseOrders, req.UseReferenceConditions,
		nullStr(req.CurrencyCode), nullStr(req.Phone), nullStr(req.Email),
	).Scan(&id, &pubID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create procurement unit: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "public_id": pubID, "code": req.Code})
}

func (h *OrgMasterHandler) UpdateProcurementUnit(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	allowed := []string{"name", "scope_type", "company_id", "reference_unit_id",
		"can_release_orders", "use_reference_conditions", "currency_code",
		"phone", "email", "is_active", "custom_attributes"}
	setClauses, args := buildUpdateSet(req, allowed, id)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields"})
		return
	}
	args = append(args, tenantID, id)
	query := fmt.Sprintf("UPDATE procurement_units SET %s, updated_at=NOW() WHERE tenant_id=$%d AND id=$%d", setClauses, len(args)-1, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OrgMasterHandler) AssignSitesToProcurementUnit(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	unitID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		SiteIDs    []int64 `json:"site_ids" binding:"required"`
		IsStandard bool    `json:"is_standard"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tx, _ := h.Pool.Begin(c.Request.Context())
	defer tx.Rollback(c.Request.Context())
	for _, siteID := range req.SiteIDs {
		tx.Exec(c.Request.Context(), `
			INSERT INTO procurement_unit_sites (tenant_id, procurement_unit_id, site_id, is_standard)
			VALUES ($1,$2,$3,$4) ON CONFLICT (tenant_id, procurement_unit_id, site_id) DO NOTHING`,
			tenantID, unitID, siteID, req.IsStandard)
		if req.IsStandard {
			tx.Exec(c.Request.Context(), `
				UPDATE procurement_unit_sites SET is_standard=false
				WHERE tenant_id=$1 AND site_id=$2 AND procurement_unit_id != $3`,
				tenantID, siteID, unitID)
		}
	}
	tx.Commit(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *OrgMasterHandler) RemoveSiteFromProcurementUnit(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	unitID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	siteID, _ := strconv.ParseInt(c.Param("sid"), 10, 64)
	// Check no open POs reference this unit+site combo
	var cnt int
	h.Pool.QueryRow(c.Request.Context(), `
		SELECT COUNT(*) FROM purchase_orders
		WHERE procurement_unit_id=$1 AND delivering_site_id=$2 AND tenant_id=$3
		AND status NOT IN ('CLOSED','CANCELLED')`, unitID, siteID, tenantID).Scan(&cnt)
	if cnt > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("%d open POs reference this unit+site. Close them first.", cnt)})
		return
	}
	h.Pool.Exec(c.Request.Context(), `
		DELETE FROM procurement_unit_sites WHERE tenant_id=$1 AND procurement_unit_id=$2 AND site_id=$3`,
		tenantID, unitID, siteID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ================================================================
// PROCUREMENT TEAMS
// ================================================================

func (h *OrgMasterHandler) ListProcurementTeams(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, public_id, code, name, COALESCE(description,''),
		  COALESCE(phone,''), COALESCE(email,''),
		  spending_limit, COALESCE(spending_currency,'INR'), material_scope, is_active, created_at
		FROM procurement_teams WHERE tenant_id=$1 ORDER BY code ASC`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64; var pubID, code, name, desc, phone, email, currency string
		var spendLimit *float64; var materialScope []string; var isActive bool; var createdAt time.Time
		if err := rows.Scan(&id, &pubID, &code, &name, &desc, &phone, &email,
			&spendLimit, &currency, &materialScope, &isActive, &createdAt); err != nil { continue }
		result = append(result, gin.H{
			"id": id, "public_id": pubID, "code": code, "name": name, "description": desc,
			"phone": phone, "email": email, "spending_limit": spendLimit,
			"spending_currency": currency, "material_scope": materialScope,
			"is_active": isActive, "created_at": createdAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"procurement_teams": result})
}

func (h *OrgMasterHandler) CreateProcurementTeam(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	var req struct {
		Code              string   `json:"code" binding:"required"`
		Name              string   `json:"name" binding:"required"`
		Description       string   `json:"description"`
		Phone             string   `json:"phone"`
		Email             string   `json:"email"`
		ResponsibleUserID *int64   `json:"responsible_user_id"`
		MaterialScope     []string `json:"material_scope"`
		SpendingLimit     float64  `json:"spending_limit"`
		SpendingCurrency  string   `json:"spending_currency"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.SpendingCurrency == "" { req.SpendingCurrency = "INR" }
	var spendLimit interface{}
	if req.SpendingLimit > 0 { spendLimit = req.SpendingLimit } else { spendLimit = nil }
	var id int64; var pubID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO procurement_teams (tenant_id, code, name, description, phone, email,
		  responsible_user_id, material_scope, spending_limit, spending_currency)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, public_id`,
		tenantID, req.Code, req.Name, nullStr(req.Description),
		nullStr(req.Phone), nullStr(req.Email), req.ResponsibleUserID,
		req.MaterialScope, spendLimit, req.SpendingCurrency,
	).Scan(&id, &pubID)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create team: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "public_id": pubID, "code": req.Code})
}

func (h *OrgMasterHandler) UpdateProcurementTeam(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	allowed := []string{"name", "description", "phone", "email", "responsible_user_id",
		"material_scope", "spending_limit", "spending_currency", "is_active", "custom_attributes"}
	setClauses, args := buildUpdateSet(req, allowed, id)
	if len(setClauses) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields"})
		return
	}
	args = append(args, tenantID, id)
	query := fmt.Sprintf("UPDATE procurement_teams SET %s, updated_at=NOW() WHERE tenant_id=$%d AND id=$%d", setClauses, len(args)-1, len(args))
	if _, err := h.Pool.Exec(c.Request.Context(), query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ================================================================
// ORG SUMMARY
// ================================================================

func (h *OrgMasterHandler) GetOrgSummary(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)

	// Tenant
	var tName, tLegal, tTax, tCountry, tCurrency, tLogo string
	h.Pool.QueryRow(c.Request.Context(), `
		SELECT COALESCE(name,''), COALESCE(legal_name,''), COALESCE(tax_id,''),
		  COALESCE(country_code,'IN'), COALESCE(currency_code,'INR'), COALESCE(logo_url,'')
		FROM tenants WHERE id=$1`, tenantID).Scan(&tName, &tLegal, &tTax, &tCountry, &tCurrency, &tLogo)

	// Companies
	compRows, _ := h.Pool.Query(c.Request.Context(), `
		SELECT id, code, name, country_code, currency_code FROM companies WHERE tenant_id=$1 AND is_active=true ORDER BY code`, tenantID)
	defer compRows.Close()
	companies := []gin.H{}
	for compRows.Next() {
		var cid int64; var ccode, cname, cCountry, cCurrency string
		if err := compRows.Scan(&cid, &ccode, &cname, &cCountry, &cCurrency); err != nil { continue }

		// Sites for company
		siteRows, _ := h.Pool.Query(c.Request.Context(), `
			SELECT id, code, name, COALESCE(site_type,'WAREHOUSE'), COALESCE(site_purpose,''), calendar_id
			FROM sites WHERE company_id=$1 AND is_active=true ORDER BY code`, cid)
		sites := []gin.H{}
		if siteRows != nil {
			for siteRows.Next() {
				var sid int64; var scode, sname, stype, spurpose string; var calID *int64
				if err := siteRows.Scan(&sid, &scode, &sname, &stype, &spurpose, &calID); err != nil { continue }
				zoneRows, _ := h.Pool.Query(c.Request.Context(), `
					SELECT id, code, name, zone_type, COALESCE(is_quarantine,false) FROM zones WHERE site_id=$1 AND is_active=true ORDER BY code`, sid)
				zones := []gin.H{}
				if zoneRows != nil {
					for zoneRows.Next() {
						var zid int64; var zcode, zname, ztype string; var isQ bool
						if err := zoneRows.Scan(&zid, &zcode, &zname, &ztype, &isQ); err != nil { continue }
						zones = append(zones, gin.H{"id": zid, "code": zcode, "name": zname, "zone_type": ztype, "is_quarantine": isQ})
					}
					zoneRows.Close()
				}
				sites = append(sites, gin.H{"id": sid, "code": scode, "name": sname, "site_type": stype, "site_purpose": spurpose, "calendar_id": calID, "zones": zones})
			}
			siteRows.Close()
		}
		companies = append(companies, gin.H{"id": cid, "code": ccode, "name": cname, "country_code": cCountry, "currency_code": cCurrency, "sites": sites})
	}

	// Procurement Units
	puRows, _ := h.Pool.Query(c.Request.Context(), `SELECT id, code, name, scope_type FROM procurement_units WHERE tenant_id=$1 AND is_active=true ORDER BY code`, tenantID)
	pUnits := []gin.H{}
	if puRows != nil {
		defer puRows.Close()
		for puRows.Next() {
			var puid int64; var pucode, puname, puscope string
			if err := puRows.Scan(&puid, &pucode, &puname, &puscope); err != nil { continue }
			pUnits = append(pUnits, gin.H{"id": puid, "code": pucode, "name": puname, "scope_type": puscope})
		}
	}

	// Procurement Teams
	ptRows, _ := h.Pool.Query(c.Request.Context(), `SELECT id, code, name, spending_limit, COALESCE(spending_currency,'INR') FROM procurement_teams WHERE tenant_id=$1 AND is_active=true ORDER BY code`, tenantID)
	pTeams := []gin.H{}
	if ptRows != nil {
		defer ptRows.Close()
		for ptRows.Next() {
			var ptid int64; var ptcode, ptname, ptcurr string; var spendLimit *float64
			if err := ptRows.Scan(&ptid, &ptcode, &ptname, &spendLimit, &ptcurr); err != nil { continue }
			pTeams = append(pTeams, gin.H{"id": ptid, "code": ptcode, "name": ptname, "spending_limit": spendLimit, "spending_currency": ptcurr})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"tenant": gin.H{"name": tName, "legal_name": tLegal, "tax_id": tTax, "country_code": tCountry, "currency_code": tCurrency, "logo_url": tLogo},
		"companies":          companies,
		"procurement_units":  pUnits,
		"procurement_teams":  pTeams,
	})
}

// ================================================================
// HELPERS
// ================================================================

func nullStr(s string) interface{} {
	if s == "" { return nil }
	return s
}

// buildUpdateSet builds a SET clause from a map of allowed field names.
// Returns the SET clause string and the args slice (starting positional index after idArg).
func buildUpdateSet(req map[string]interface{}, allowed []string, startArg interface{}) (string, []interface{}) {
	allowedSet := make(map[string]bool)
	for _, a := range allowed {
		allowedSet[a] = true
	}
	var parts []string
	var args []interface{}
	idx := 1
	for k, v := range req {
		if !allowedSet[k] { continue }
		parts = append(parts, fmt.Sprintf("%s = $%d", k, idx))
		args = append(args, v)
		idx++
	}
	if len(parts) == 0 { return "", nil }
	clause := ""
	for i, p := range parts {
		if i > 0 { clause += ", " }
		clause += p
	}
	return clause, args
}
