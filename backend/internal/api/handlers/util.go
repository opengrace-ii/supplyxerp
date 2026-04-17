package handlers

import (
	"math/big"

	"github.com/jackc/pgx/v5/pgtype"
)

func stringToText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
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
