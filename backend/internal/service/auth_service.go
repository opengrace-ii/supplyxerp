package service

import (
	"context"
	"errors"
	"erplite/backend/internal/db/dbgen"
	"erplite/backend/internal/security"
	"erplite/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type AuthService struct {
	queries *dbgen.Queries
}

func NewAuthService(queries *dbgen.Queries) *AuthService {
	return &AuthService{queries: queries}
}

func (s *AuthService) Authenticate(ctx context.Context, username, password string) (*security.UserClaims, error) {
	if username == "" || password == "" {
		return nil, utils.NewAppError(400, "INVALID_CREDENTIALS", "username and password required")
	}

	user, err := s.queries.GetUserByUsername(ctx, username)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, utils.NewAppError(401, "UNAUTHORIZED", "invalid credentials")
		}
		return nil, err
	}

	if err := security.CheckPassword(user.PasswordHash, password); err != nil {
		return nil, utils.NewAppError(401, "UNAUTHORIZED", "invalid credentials")
	}

	roles, err := s.queries.GetUserRoles(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	role := "viewer"
	if len(roles) > 0 {
		role = roles[0]
	}

	idStr := ""
	if user.PublicID.Valid {
		u, _ := uuid.FromBytes(user.PublicID.Bytes[:])
		idStr = u.String()
	}

	return &security.UserClaims{
		UserID:   idStr,
		Username: user.Username,
		Role:     role,
	}, nil
}
