package repository

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"math/big"
)

func newID() string {
	return uuid.NewString()
}

func NumericFromFloat(f float64) pgtype.Numeric {
	return pgtype.Numeric{
		Int:   big.NewInt(int64(f * 10000)),
		Exp:   -4,
		Valid: true,
	}
}

func FloatFromNumeric(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, _ := n.Int.Float64()
	for i := 0; i < int(-n.Exp); i++ {
		f /= 10
	}
	return f
}
