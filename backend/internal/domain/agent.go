package domain

import (
	"context"

	"github.com/google/uuid"
)

type Agent interface {
	Name() string
	Execute(ctx context.Context, req AgentRequest) (AgentResult, error)
}

type AgentRequest struct {
	TraceID  uuid.UUID
	TenantID int64
	ActorID  int64
	Payload  map[string]any
}

type AgentResult struct {
	Status  string // "SUCCESS" | "FAILED" | "BLOCKED"
	Data    map[string]any
	Message string
}

type CtxKey string

const CtxTraceKey CtxKey = "trace"
