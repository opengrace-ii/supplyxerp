package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrgHandler struct {
	Pool *pgxpool.Pool
}

func NewOrgHandler(pool *pgxpool.Pool) *OrgHandler {
	return &OrgHandler{Pool: pool}
}

func (h *OrgHandler) ListOrganisations(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, public_id, name, legal_name, currency, fiscal_year_start, is_active 
		FROM organisations 
		WHERE tenant_id = $1 
		ORDER BY created_at ASC`, tenantID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var orgs []gin.H
	for rows.Next() {
		var id int64
		var publicID, name, currency string
		var legalName *string
		var fyStart int
		var isActive bool

		if err := rows.Scan(&id, &publicID, &name, &legalName, &currency, &fyStart, &isActive); err != nil {
			continue
		}
		
		orgs = append(orgs, gin.H{
			"id":         id,
			"public_id":  publicID,
			"name":       name,
			"legal_name": legalName,
			"currency":   currency,
			"fiscal_year_start": fyStart,
			"is_active":  isActive,
		})
	}

	if orgs == nil {
		orgs = []gin.H{}
	}
	c.JSON(http.StatusOK, orgs)
}

type CreateOrgReq struct {
	Name            string `json:"name" binding:"required"`
	LegalName       string `json:"legal_name"`
	Currency        string `json:"currency" binding:"required"`
	FiscalYearStart int    `json:"fiscal_year_start" binding:"required"`
}

func (h *OrgHandler) CreateOrganisation(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	
	var req CreateOrgReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	legalName := &req.LegalName
	if *legalName == "" {
		legalName = nil
	}

	var pubID string
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO organisations (tenant_id, name, legal_name, currency, fiscal_year_start)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING public_id
	`, tenantID, req.Name, legalName, req.Currency, req.FiscalYearStart).Scan(&pubID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create organisation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"public_id": pubID})
}

func (h *OrgHandler) ListSites(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	orgID := c.Param("id") // this is public_id but integer lookup is preferred for simplicity if possible. Wait, the frontend might send integers if we sent them, or public_ids. Let's assume frontend sends internal id for orgID. Actually it's public_id for external API exposure.

	// Since we should use public_id in API, let's lookup org.id by public_id.
	var internalOrgId int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM organisations WHERE public_id = $1 AND tenant_id = $2", orgID, tenantID).Scan(&internalOrgId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organisation not found"})
		return
	}

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, public_id, code, name, timezone, is_active 
		FROM sites 
		WHERE tenant_id = $1 AND organisation_id = $2 
		ORDER BY code ASC`, tenantID, internalOrgId)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var sites []gin.H
	for rows.Next() {
		var id int64
		var publicID, code, name, timezone string
		var isActive bool

		if err := rows.Scan(&id, &publicID, &code, &name, &timezone, &isActive); err != nil {
			continue
		}
		
		sites = append(sites, gin.H{
			"id":        id,
			"public_id": publicID,
			"code":      code,
			"name":      name,
			"timezone":  timezone,
			"is_active": isActive,
		})
	}
	
	if sites == nil {
		sites = []gin.H{}
	}

	c.JSON(http.StatusOK, sites)
}

type CreateSiteReq struct {
	Code     string `json:"code" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Timezone string `json:"timezone" binding:"required"`
}

func (h *OrgHandler) CreateSite(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	orgID := c.Param("id")

	var internalOrgId int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM organisations WHERE public_id = $1 AND tenant_id = $2", orgID, tenantID).Scan(&internalOrgId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organisation not found"})
		return
	}

	var req CreateSiteReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var pubID string
	err = h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO sites (tenant_id, organisation_id, code, name, timezone)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING public_id
	`, tenantID, internalOrgId, req.Code, req.Name, req.Timezone).Scan(&pubID)
	
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create site (duplicate code?)"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"public_id": pubID})
}

func (h *OrgHandler) ListZones(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	siteID := c.Param("id") // site public_id

	var internalSiteId int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM sites WHERE public_id = $1 AND tenant_id = $2", siteID, tenantID).Scan(&internalSiteId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, public_id, code, name, zone_type, is_active 
		FROM zones 
		WHERE tenant_id = $1 AND site_id = $2 
		ORDER BY created_at ASC`, tenantID, internalSiteId)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var zones []gin.H
	for rows.Next() {
		var id int64
		var publicID, code, name, zoneType string
		var isActive bool

		if err := rows.Scan(&id, &publicID, &code, &name, &zoneType, &isActive); err != nil {
			continue
		}
		
		zones = append(zones, gin.H{
			"id":        id,
			"public_id": publicID,
			"code":      code,
			"name":      name,
			"zone_type": zoneType,
			"is_active": isActive,
		})
	}

	if zones == nil {
		zones = []gin.H{}
	}

	c.JSON(http.StatusOK, zones)
}

type CreateZoneReq struct {
	Code     string `json:"code" binding:"required"`
	Name     string `json:"name" binding:"required"`
	ZoneType string `json:"zone_type" binding:"required"`
}

func (h *OrgHandler) CreateZone(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)
	siteID := c.Param("id")

	var internalSiteId int64
	err := h.Pool.QueryRow(c.Request.Context(), "SELECT id FROM sites WHERE public_id = $1 AND tenant_id = $2", siteID, tenantID).Scan(&internalSiteId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	var req CreateZoneReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var pubID string
	err = h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO zones (tenant_id, site_id, code, name, zone_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING public_id
	`, tenantID, internalSiteId, req.Code, req.Name, req.ZoneType).Scan(&pubID)
	
	if err != nil {
		fmt.Printf("CreateZone error: %v\n", err)
		c.JSON(http.StatusConflict, gin.H{"error": "Failed to create zone (duplicate code?)"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"public_id": pubID})
}

// GetOrgTree returns the entire hierarchy for the tenant
func (h *OrgHandler) GetOrgTree(c *gin.Context) {
	tenantID := c.MustGet("tenant_id").(int64)

	// Fetch all orgs
	orgRows, err := h.Pool.Query(c.Request.Context(), `SELECT id, public_id, name, currency FROM organisations WHERE tenant_id = $1 ORDER BY created_at ASC`, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error orgs"})
		return
	}
	defer orgRows.Close()

	var orgs []gin.H
	orgIDs := []int64{}
	for orgRows.Next() {
		var id int64
		var pid, name, curr string
		if err := orgRows.Scan(&id, &pid, &name, &curr); err == nil {
			orgs = append(orgs, gin.H{"type": "organisation", "id": id, "public_id": pid, "name": name, "currency": curr, "sites": []gin.H{}})
			orgIDs = append(orgIDs, id)
		}
	}

	// Fetch sites
	siteRows, err := h.Pool.Query(c.Request.Context(), `SELECT id, organisation_id, public_id, code, name FROM sites WHERE tenant_id = $1 ORDER BY code ASC`, tenantID)
	if err == nil {
		defer siteRows.Close()
		var sites []gin.H
		for siteRows.Next() {
			var id, orgId int64
			var pid, code, name string
			if err := siteRows.Scan(&id, &orgId, &pid, &code, &name); err == nil {
				sites = append(sites, gin.H{"type": "site", "id": id, "organisation_id": orgId, "public_id": pid, "code": code, "name": name, "zones": []gin.H{}})
			}
		}

		// Fetch zones
		zoneRows, err := h.Pool.Query(c.Request.Context(), `SELECT id, site_id, public_id, code, name, zone_type FROM zones WHERE tenant_id = $1 ORDER BY code ASC`, tenantID)
		if err == nil {
			defer zoneRows.Close()
			for zoneRows.Next() {
				var id, siteId int64
				var pid, code, name, zType string
				if err := zoneRows.Scan(&id, &siteId, &pid, &code, &name, &zType); err == nil {
					// Attach zone to site
					for i, s := range sites {
						if s["id"] == siteId {
							sZones := s["zones"].([]gin.H)
							sZones = append(sZones, gin.H{"type": "zone", "id": id, "public_id": pid, "code": code, "name": name, "zone_type": zType})
							sites[i]["zones"] = sZones
						}
					}
				}
			}
		}

		// Attach sites to orgs
		for i, o := range orgs {
			oSites := o["sites"].([]gin.H)
			for _, s := range sites {
				if s["organisation_id"] == o["id"] {
					oSites = append(oSites, s)
				}
			}
			orgs[i]["sites"] = oSites
		}
	}

	c.JSON(http.StatusOK, orgs)
}
