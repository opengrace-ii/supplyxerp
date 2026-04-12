package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type DBTX interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type UnitOfWork struct {
	HU             *HURepository
	Events         *EventRepository
	Barcodes       *BarcodeRepository
	WarehouseTasks *WarehouseTaskRepository
	Pricing        *PricingRepository
	Audit          *AuditRepository
	Users          *UserRepository
	Guards         *GuardRepository
	Products       *ProductRepository
	Trace          *TraceRepository
	Locations      *LocationRepository
}

func NewUnitOfWork(db DBTX) *UnitOfWork {
	return &UnitOfWork{
		HU:             &HURepository{db: db},
		Events:         &EventRepository{db: db},
		Barcodes:       &BarcodeRepository{db: db},
		WarehouseTasks: &WarehouseTaskRepository{db: db},
		Pricing:        &PricingRepository{db: db},
		Audit:          &AuditRepository{db: db},
		Users:          &UserRepository{db: db},
		Guards:         &GuardRepository{db: db},
		Products:       &ProductRepository{db: db},
		Trace:          &TraceRepository{db: db},
		Locations:      &LocationRepository{db: db},
	}
}
