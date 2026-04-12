package middleware

import (
	"log/slog"
	"time"

	"erplite/backend/internal/domain"
	"github.com/gin-gonic/gin"
)

func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		end := time.Now()
		latency := end.Sub(start)

		claims, hasClaims := GetClaims(c)
		actorID := "anonymous"
		tenantID := int64(0) // Default for techlogix seed
		if hasClaims {
			actorID = claims.UserID
			// In a real implementation with multi-tenancy we'd get TenantID from claims
			tenantID = 1 // Hardcoding standard tenant for now
		}

		traceIDRaw, exists := c.Get(string(domain.CtxTraceKey))
		traceID := ""
		if exists, ok := traceIDRaw.(string); ok {
			traceID = exists
		}

		slog.Info("HTTP Request",
			"method", c.Request.Method,
			"path", path,
			"query", query,
			"status", c.Writer.Status(),
			"duration_ms", latency.Milliseconds(),
			"client_ip", c.ClientIP(),
			"actor_id", actorID,
			"tenant_id", tenantID,
			"trace_id", traceID,
		)
	}
}
