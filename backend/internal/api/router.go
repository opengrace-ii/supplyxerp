package api

import (
	"net/http"

	"erplite/backend/internal/api/handlers"
	"erplite/backend/internal/api/middleware"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type RouterDeps struct {
	JWTSecret   string
	AllowedHost string
	AuthHandler *handlers.AuthHandler
}

func NewRouter(deps RouterDeps) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.StructuredLogger())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{deps.AllowedHost},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	auth := r.Group("/api/auth")
	{
		auth.POST("/login", deps.AuthHandler.Login)
	}

	secured := r.Group("/")
	secured.Use(middleware.AuthRequired(deps.JWTSecret))
	{
		secured.POST("/api/auth/logout", deps.AuthHandler.Logout)
		secured.GET("/api/auth/me", deps.AuthHandler.Me)
	}

	return r
}
