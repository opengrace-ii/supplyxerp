package middleware

import (
	"net/http"

	"supplyxerp/backend/internal/security"
	"github.com/gin-gonic/gin"
)

const claimsKey = "claims"

func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenValue, err := c.Cookie("supplyxerp_token")
		if err != nil || tokenValue == "" {
			// Fallback to Header Support (for CURL/CLI testing)
			const prefix = "Bearer "
			authHeader := c.GetHeader("Authorization")
			if len(authHeader) > len(prefix) && authHeader[:len(prefix)] == prefix {
				tokenValue = authHeader[len(prefix):]
			}
		}

		if tokenValue == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		claims, err := security.ParseToken(tokenValue, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		// Inject key IDs directly into context for handler consumption
		c.Set(claimsKey, claims)
		c.Set("tenant_id", claims.TenantID)
		c.Set("user_id", claims.InternalID)
		
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(c *gin.Context) {
		claims, ok := GetClaims(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing user claims"})
			return
		}
		if _, ok := allowed[claims.Role]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}

func GetClaims(c *gin.Context) (security.UserClaims, bool) {
	claimsRaw, exists := c.Get(claimsKey)
	if !exists {
		return security.UserClaims{}, false
	}
	claims, ok := claimsRaw.(security.UserClaims)
	if !ok {
		return security.UserClaims{}, false
	}
	return claims, true
}
