package repository

import (
	"context"
	"encoding/json"
	"time"
)

type ConfigRepository struct{ db DBTX }

type TenantConfig struct {
	ID                  int64      `json:"id"`
	TenantID            int64      `json:"tenant_id"`
	GRSequenceStart     int64      `json:"gr_sequence_start"`
	POSequenceStart     int64      `json:"po_sequence_start"`
	HUSequenceStart     int64      `json:"hu_sequence_start"`
	SOSequenceStart     int64      `json:"so_sequence_start"`
	GRNumberFormat      string     `json:"gr_number_format"`
	PONumberFormat      string     `json:"po_number_format"`
	HUCodeFormat        string     `json:"hu_code_format"`
	SONumberFormat      string     `json:"so_number_format"`
	DomainProfile       string     `json:"domain_profile"`
	DefaultCurrency     string     `json:"default_currency"`
	DefaultTimezone     string     `json:"default_timezone"`
	DefaultUOM          string     `json:"default_uom"`
	BatchTracking       bool       `json:"batch_tracking"`
	ExpiryTracking      bool       `json:"expiry_tracking"`
	SerialTracking      bool       `json:"serial_tracking"`
	QCOnReceipt         bool       `json:"qc_on_receipt"`
	FIFOEnforced        bool       `json:"fifo_enforced"`
	MigrationCompleted  bool       `json:"migration_completed"`
	GoLiveDate          *time.Time `json:"go_live_date"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

func (r *ConfigRepository) GetByTenant(ctx context.Context, tenantID int64) (*TenantConfig, error) {
	var c TenantConfig
	err := r.db.QueryRow(ctx, `
		SELECT id, tenant_id, gr_sequence_start, po_sequence_start, hu_sequence_start, so_sequence_start,
		       gr_number_format, po_number_format, hu_code_format, so_number_format,
		       domain_profile, default_currency, default_timezone, default_uom,
		       batch_tracking, expiry_tracking, serial_tracking, qc_on_receipt, fifo_enforced,
		       migration_completed, go_live_date, updated_at
		FROM tenant_config WHERE tenant_id = $1
	`, tenantID).Scan(
		&c.ID, &c.TenantID, &c.GRSequenceStart, &c.POSequenceStart, &c.HUSequenceStart, &c.SOSequenceStart,
		&c.GRNumberFormat, &c.PONumberFormat, &c.HUCodeFormat, &c.SONumberFormat,
		&c.DomainProfile, &c.DefaultCurrency, &c.DefaultTimezone, &c.DefaultUOM,
		&c.BatchTracking, &c.ExpiryTracking, &c.SerialTracking, &c.QCOnReceipt, &c.FIFOEnforced,
		&c.MigrationCompleted, &c.GoLiveDate, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ConfigRepository) Update(ctx context.Context, c TenantConfig) error {
	_, err := r.db.Exec(ctx, `
		UPDATE tenant_config SET 
			gr_sequence_start=$1, po_sequence_start=$2, hu_sequence_start=$3, so_sequence_start=$4,
			gr_number_format=$5, po_number_format=$6, hu_code_format=$7, so_number_format=$8,
			domain_profile=$9, default_currency=$10, default_timezone=$11, default_uom=$12,
			batch_tracking=$13, expiry_tracking=$14, serial_tracking=$15, qc_on_receipt=$16, fifo_enforced=$17,
			migration_completed=$18, go_live_date=$19, updated_at=now()
		WHERE tenant_id = $20
	`, c.GRSequenceStart, c.POSequenceStart, c.HUSequenceStart, c.SOSequenceStart,
		c.GRNumberFormat, c.PONumberFormat, c.HUCodeFormat, c.SONumberFormat,
		c.DomainProfile, c.DefaultCurrency, c.DefaultTimezone, c.DefaultUOM,
		c.BatchTracking, c.ExpiryTracking, c.SerialTracking, c.QCOnReceipt, c.FIFOEnforced,
		c.MigrationCompleted, c.GoLiveDate, c.TenantID,
	)
	return err
}

func (r *ConfigRepository) GetModules(ctx context.Context, tenantID int64) (map[string]bool, error) {
	var raw []byte
	err := r.db.QueryRow(ctx,
		`SELECT enabled_modules FROM tenant_config WHERE tenant_id = $1`, tenantID,
	).Scan(&raw)
	if err != nil {
		return nil, err
	}
	result := map[string]bool{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &result)
	}
	return result, nil
}

func (r *ConfigRepository) UpdateModules(ctx context.Context, tenantID int64, modules map[string]bool) error {
	raw, err := json.Marshal(modules)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx,
		`UPDATE tenant_config SET enabled_modules = $1, updated_at = now() WHERE tenant_id = $2`,
		raw, tenantID,
	)
	return err
}

func (r *ConfigRepository) ReseedSequence(ctx context.Context, tenantID int64, seqType string, newValue int64) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
		VALUES ($1, $2, $3)
		ON CONFLICT (tenant_id, sequence_type)
		DO UPDATE SET current_val = $3, updated_at = now()
	`, tenantID, seqType, newValue)
	return err
}

type MigrationRepository struct{ db DBTX }

type OpeningBalanceImport struct {
	ID          int64           `json:"id"`
	TenantID    int64           `json:"tenant_id"`
	PublicID    string          `json:"public_id"`
	ImportDate  time.Time       `json:"import_date"`
	TotalLines  int             `json:"total_lines"`
	PostedLines int             `json:"posted_lines"`
	FailedLines int             `json:"failed_lines"`
	Status      string          `json:"status"`
	ErrorLog    json.RawMessage `json:"error_log"`
	CreatedAt   time.Time       `json:"created_at"`
}

func (r *MigrationRepository) CreateImportBatch(ctx context.Context, b OpeningBalanceImport) (int64, error) {
	var id int64
	err := r.db.QueryRow(ctx, `
		INSERT INTO opening_balance_imports (tenant_id, import_date, total_lines, status)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, b.TenantID, b.ImportDate, b.TotalLines, b.Status).Scan(&id)
	return id, err
}

func (r *MigrationRepository) UpdateImportBatch(ctx context.Context, id int64, posted, failed int, status string, errorLog any) error {
	logJSON, _ := json.Marshal(errorLog)
	_, err := r.db.Exec(ctx, `
		UPDATE opening_balance_imports 
		SET posted_lines=$1, failed_lines=$2, status=$3, error_log=$4 
		WHERE id = $5
	`, posted, failed, status, logJSON, id)
	return err
}

func (r *MigrationRepository) ListImports(ctx context.Context, tenantID int64) ([]OpeningBalanceImport, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, public_id, tenant_id, import_date, total_lines, posted_lines, failed_lines, status, created_at
		FROM opening_balance_imports 
		WHERE tenant_id = $1 
		ORDER BY created_at DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var imports []OpeningBalanceImport
	for rows.Next() {
		var i OpeningBalanceImport
		if err := rows.Scan(&i.ID, &i.PublicID, &i.TenantID, &i.ImportDate, &i.TotalLines, &i.PostedLines, &i.FailedLines, &i.Status, &i.CreatedAt); err == nil {
			imports = append(imports, i)
		}
	}
	return imports, nil
}
