package handlers

import (
	"net/http"
	"time"

	"supplyxerp/backend/internal/api/middleware"
	"supplyxerp/backend/internal/security"
	"supplyxerp/backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService   *service.AuthService
	jwtSecret     string
	jwtTTLMinutes int
	cookieSecure  bool
}

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func NewAuthHandler(authService *service.AuthService, jwtSecret string, jwtTTLMinutes int, cookieSecure bool) *AuthHandler {
	return &AuthHandler{
		authService:   authService,
		jwtSecret:     jwtSecret,
		jwtTTLMinutes: jwtTTLMinutes,
		cookieSecure:  cookieSecure,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": gin.H{"message": "username and password are required"}})
		return
	}

	claims, err := h.authService.Authenticate(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": gin.H{"message": err.Error()}})
		return
	}

	token, expiresAt, err := security.GenerateToken(*claims, h.jwtSecret, h.jwtTTLMinutes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": gin.H{"message": "unable to issue token"}})
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("supplyxerp_token", token, int(time.Until(expiresAt).Seconds()), "/", "", h.cookieSecure, true)
	c.JSON(http.StatusOK, gin.H{
		"success": true, 
		"data": gin.H{
			"user": claims,
			"access_token": token,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("supplyxerp_token", "", -1, "/", "", h.cookieSecure, true)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
	claims, ok := middleware.GetClaims(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": gin.H{"message": "not authenticated"}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": claims}})
}
