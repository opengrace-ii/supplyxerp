package middleware

import (
	"net/http"

	"erplite/backend/internal/security"
	"github.com/gin-gonic/gin"
)

const claimsKey = "claims"

func AuthRequired(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenValue, err := c.Cookie("erplite_token")
		if err != nil || tokenValue == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}

		claims, err := security.ParseToken(tokenValue, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set(claimsKey, claims)
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
