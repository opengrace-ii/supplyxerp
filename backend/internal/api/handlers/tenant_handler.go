package handlers

import (
	"net/http"

	"supplyxerp/backend/internal/events"
	"supplyxerp/backend/internal/org"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TenantHandler struct {
	Pool *pgxpool.Pool
	Hub  *events.Hub
}

func NewTenantHandler(pool *pgxpool.Pool, hub *events.Hub) *TenantHandler {
	return &TenantHandler{Pool: pool, Hub: hub}
}

func (h *TenantHandler) ListTenants(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), "SELECT id, name, slug, created_at FROM tenants ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tenants"})
		return
	}
	defer rows.Close()

	tenants := []gin.H{}
	for rows.Next() {
		var id int64
		var name, slug string
		var createdAt any
		if err := rows.Scan(&id, &name, &slug, &createdAt); err != nil {
			continue
		}
		tenants = append(tenants, gin.H{
			"id":         id,
			"name":       name,
			"slug":       slug,
			"created_at": createdAt,
		})
	}

	c.JSON(http.StatusOK, tenants)
}

type CreateTenantRequest struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug" binding:"required"`
}

func (h *TenantHandler) CreateTenant(c *gin.Context) {
	var req CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.Begin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer tx.Rollback(c.Request.Context())

	var id int64
	err = tx.QueryRow(c.Request.Context(), 
		"INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id", 
		req.Name, req.Slug).Scan(&id)
	
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Tenant with this slug already exists"})
		return
	}

	if err := org.AutoProvisionTenant(c.Request.Context(), tx, id, req.Name, h.Hub); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to auto-provision organisation structure"})
		return
	}

	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Commit failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "name": req.Name, "slug": req.Slug})
}
