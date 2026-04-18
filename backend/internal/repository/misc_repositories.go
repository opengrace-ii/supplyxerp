package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgtype"
)

type WarehouseTaskRepository struct{ db DBTX }
type PricingRepository struct{ db DBTX }
type AuditRepository struct{ db DBTX }
type UserRepository struct{ db DBTX }
type GuardRepository struct{ db DBTX }
type TraceRepository struct{ db DBTX }

type WarehouseTask struct {
	ID          int64  `json:"id"`
	PublicID    string `json:"public_id"`
	TenantID    int64  `json:"tenant_id"`
	TaskType    string `json:"task_type"`
	Status      string `json:"status"`
	HuID        int64  `json:"hu_id"`
	FromZoneID  *int64 `json:"from_zone_id"`
	ToZoneID    *int64 `json:"to_zone_id"`
	Priority    int    `json:"priority"`
	CreatedAt   string `json:"created_at"`
}

func (r *WarehouseTaskRepository) Create(ctx context.Context, t WarehouseTask) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO warehouse_tasks (tenant_id, task_type, status, hu_id, from_zone_id, priority)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, t.TenantID, t.TaskType, t.Status, t.HuID, t.FromZoneID, t.Priority).Scan(&id)
	return id, err
}

func (r *WarehouseTaskRepository) Complete(ctx context.Context, taskID int64, toZoneID int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE warehouse_tasks 
		SET status = 'COMPLETED', to_zone_id = $1, confirmed_at = now() 
		WHERE id = $2
	`, toZoneID, taskID)
	return err
}

func (r *WarehouseTaskRepository) GetByID(ctx context.Context, id int64) (WarehouseTask, error) {
	var t WarehouseTask
	err := r.db.QueryRow(ctx, `
		SELECT id, public_id, tenant_id, task_type, status, hu_id, from_zone_id, to_zone_id, priority
		FROM warehouse_tasks WHERE id = $1
	`, id).Scan(&t.ID, &t.PublicID, &t.TenantID, &t.TaskType, &t.Status, &t.HuID, &t.FromZoneID, &t.ToZoneID, &t.Priority)
	return t, err
}

func (r *WarehouseTaskRepository) ListOpenByTenant(ctx context.Context, tenantID int64) ([]WarehouseTask, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, public_id::text, tenant_id, task_type, status, hu_id, from_zone_id, to_zone_id, priority, opened_at::text
		FROM warehouse_tasks 
		WHERE tenant_id = $1 AND status = 'OPEN' 
		ORDER BY priority DESC, opened_at ASC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []WarehouseTask
	for rows.Next() {
		var t WarehouseTask
		if err := rows.Scan(&t.ID, &t.PublicID, &t.TenantID, &t.TaskType, &t.Status, &t.HuID, &t.FromZoneID, &t.ToZoneID, &t.Priority, &t.CreatedAt); err == nil {
			tasks = append(tasks, t)
		}
	}
	return tasks, nil
}

func (r *AuditRepository) Log(ctx context.Context, tenantID int64, actorID int64, action string, entityType string, entityID any, before, after any) error {
	var publicID pgtype.UUID
	switch v := entityID.(type) {
	case pgtype.UUID:
		publicID = v
	case string:
		publicID.Scan(v)
	}

	bJSON, _ := json.Marshal(before)
	aJSON, _ := json.Marshal(after)
	_, err := r.db.Exec(ctx, `
		INSERT INTO audit_log (tenant_id, actor_id, action, entity_type, entity_public_id, payload_before, payload_after)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, tenantID, actorID, action, entityType, publicID, bJSON, aJSON)
	return err
}

func (r *UserRepository) Create(ctx any, user any) error { return nil }
func (r *TraceRepository) Record(ctx any, action string) error { return nil }
func (r *PricingRepository) GetPrice(ctx any, productID int64) (float64, error) { return 0, nil }
