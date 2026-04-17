package security

import (
	"time"
	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	UserID     string `json:"id"`       // Public UUID string
	InternalID int64  `json:"internal_id"`
	TenantID   int64  `json:"tenant_id"`
	Username   string `json:"username"`
	Role       string `json:"role"`
}

type Claims struct {
	UserID     string `json:"user_id"`
	InternalID int64  `json:"internal_id"`
	TenantID   int64  `json:"tenant_id"`
	Username   string `json:"username"`
	Role       string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(claims UserClaims, secret string, ttlMinutes int) (string, time.Time, error) {
	expiresAt := time.Now().UTC().Add(time.Duration(ttlMinutes) * time.Minute)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		UserID:     claims.UserID,
		InternalID: claims.InternalID,
		TenantID:   claims.TenantID,
		Username:   claims.Username,
		Role:       claims.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   claims.UserID,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
		},
	})
	signed, err := token.SignedString([]byte(secret))
	return signed, expiresAt, err
}

func ParseToken(tokenValue, secret string) (UserClaims, error) {
	token, err := jwt.ParseWithClaims(tokenValue, &Claims{}, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return UserClaims{}, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return UserClaims{}, jwt.ErrTokenInvalidClaims
	}

	return UserClaims{
		UserID:     claims.UserID, 
		InternalID: claims.InternalID,
		TenantID:   claims.TenantID,
		Username:   claims.Username, 
		Role:       claims.Role,
	}, nil
}
