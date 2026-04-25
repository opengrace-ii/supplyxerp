package handlers

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"supplyxerp/backend/internal/logger"
)

type UsersHandler struct {
	Pool *pgxpool.Pool
}

func NewUsersHandler(pool *pgxpool.Pool) *UsersHandler {
	return &UsersHandler{Pool: pool}
}

func (h *UsersHandler) ListUsers(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT u.id, u.username, u.email, u.created_at, r.name as role
		FROM users u
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id
		ORDER BY u.id
	`)
	if err != nil {
		logger.LogError("SYSTEM", "UsersHandler", "ListUsers", err.Error())
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type User struct {
		ID        int64   `json:"id"`
		Username  string  `json:"username"`
		Email     *string `json:"email"`
		Role      *string `json:"role"`
		CreatedAt string  `json:"created_at"`
	}
	var users []User
	for rows.Next() {
		var u User
		var cAt time.Time
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &cAt, &u.Role); err == nil {
			u.CreatedAt = cAt.Format("2006-01-02 15:04:05")
			users = append(users, u)
		}
	}
	c.JSON(200, gin.H{"users": users})
}

func (h *UsersHandler) CreateUser(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	validRoles := map[string]bool{
		"ADMIN": true, "WAREHOUSE_MANAGER": true, "OPERATOR": true, "VIEWER": true, "PURCHASING": true,
	}
	if !validRoles[req.Role] {
		c.JSON(400, gin.H{"error": "Invalid role"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash password"})
		return
	}

	ctx := c.Request.Context()
	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var userID int64
	err = tx.QueryRow(ctx, "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
		req.Username, req.Email, string(hash)).Scan(&userID)
	if err != nil {
		logger.LogError("SYSTEM", "UsersHandler", "CreateUser", err.Error())
		c.JSON(400, gin.H{"error": "Username or email might already exist"})
		return
	}

	var roleID int64
	err = tx.QueryRow(ctx, "SELECT id FROM roles WHERE name=$1", req.Role).Scan(&roleID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Role not found in DB"})
		return
	}

	tx.Exec(ctx, "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", userID, roleID)

	tx.Commit(ctx)
	c.JSON(201, gin.H{
		"id":       userID,
		"username": req.Username,
		"email":    req.Email,
		"role":     req.Role,
	})
}

func (h *UsersHandler) UpdateRole(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Role string `json:"role"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	validRoles := map[string]bool{
		"ADMIN": true, "WAREHOUSE_MANAGER": true, "OPERATOR": true, "VIEWER": true, "PURCHASING": true,
	}
	if !validRoles[req.Role] {
		c.JSON(400, gin.H{"error": "Invalid role"})
		return
	}

	ctx := c.Request.Context()
	
	// Ensure we don't demote the last admin
	if req.Role != "ADMIN" {
		var currentRole string
		h.Pool.QueryRow(ctx, "SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1", id).Scan(&currentRole)
		
		if currentRole == "ADMIN" {
			var adminCount int
			h.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.name = 'ADMIN'").Scan(&adminCount)
			if adminCount <= 1 {
				c.JSON(400, gin.H{"error": "Cannot demote the last ADMIN"})
				return
			}
		}
	}

	tx, err := h.Pool.Begin(ctx)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(ctx)

	var roleID int64
	err = tx.QueryRow(ctx, "SELECT id FROM roles WHERE name=$1", req.Role).Scan(&roleID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Role not found in DB"})
		return
	}

	tx.Exec(ctx, "DELETE FROM user_roles WHERE user_id=$1", id)
	tx.Exec(ctx, "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", id, roleID)

	tx.Commit(ctx)
	c.JSON(200, gin.H{"message": "Role updated"})
}

func (h *UsersHandler) UpdatePassword(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		NewPassword string `json:"new_password"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash password"})
		return
	}

	_, err = h.Pool.Exec(c.Request.Context(), "UPDATE users SET password_hash=$1 WHERE id=$2", string(hash), id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Password updated"})
}

func (h *UsersHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")

	// Cannot delete yourself
	myID := fmt.Sprintf("%v", c.MustGet("user_id"))
	if id == myID {
		c.JSON(400, gin.H{"error": "Cannot delete yourself"})
		return
	}

	// For now, attempt hard delete. If FK constraints fail, we return an error.
	ctx := c.Request.Context()
	tx, _ := h.Pool.Begin(ctx)
	defer tx.Rollback(ctx)

	tx.Exec(ctx, "DELETE FROM user_roles WHERE user_id=$1", id)
	_, err := tx.Exec(ctx, "DELETE FROM users WHERE id=$1", id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Cannot delete user. They are referenced in other records."})
		return
	}
	
	tx.Commit(ctx)
	c.JSON(200, gin.H{"message": "User deleted"})
}
