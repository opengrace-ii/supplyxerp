package handlers

import (
	"math/big"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func stringToText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

func parseUUID(s string) uuid.UUID {
	u, _ := uuid.Parse(s)
	return u
}

func int64ToInt8(i int64) pgtype.Int8 {
	return pgtype.Int8{Int64: i, Valid: i != 0}
}

func textToString(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func numericToFloat(n pgtype.Numeric) float64 {
	f, _ := n.Float64Value()
	return f.Float64
}

func numericFromFloat(f float64) pgtype.Numeric {
	return pgtype.Numeric{
		Int:   bigInt(int64(f * 10000)),
		Exp:   -4,
		Valid: true,
	}
}

func bigInt(n int64) *big.Int {
	return big.NewInt(n)
}

func mustTenantID(c *gin.Context) int64 {
	return c.MustGet("tenant_id").(int64)
}

func mustUserID(c *gin.Context) int64 {
	return c.MustGet("user_id").(int64)
}
