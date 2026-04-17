package repository

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type GRRepository struct {
	db DBTX
}

type GRDocument struct {
	ID                 int64      `json:"id"`
	PublicID           string     `json:"public_id"`
	TenantID           int64      `json:"tenant_id"`
	OrganisationID     int64      `json:"organisation_id"`
	SiteID             int64      `json:"site_id"`
	ZoneID             int64      `json:"zone_id"`
	GRNumber           string     `json:"gr_number"`
	Status             string     `json:"status"`
	DocumentDate       time.Time  `json:"document_date"`
	PostingDate        time.Time  `json:"posting_date"`
	MovementType       string     `json:"movement_type"`
	FiscalYear         int        `json:"fiscal_year"`
	SupplierID         *int64     `json:"supplier_id"`
	SupplierRef        string     `json:"supplier_ref"`
	DeliveryNoteNumber string     `json:"delivery_note_number"`
	BillOfLading       string     `json:"bill_of_lading"`
	Notes              string     `json:"notes"`
	PostedAt           *time.Time `json:"posted_at"`
	PostedBy           *int64     `json:"posted_by"`
	ReversalOfGRID     *int64     `json:"reversal_of_gr_id"`
	CreatedBy          *int64     `json:"created_by"`
	CreatedAt          time.Time  `json:"created_at"`
}

type GRLine struct {
	ID           int64   `json:"id"`
	PublicID     string  `json:"public_id"`
	LineNumber   int     `json:"line_number"`
	ProductID    int64   `json:"product_id"`
	ProductName  string  `json:"product_name"`
	ProductCode  string  `json:"product_code"`
	ShortText    string  `json:"short_text"`
	Quantity     float64 `json:"quantity"`
	Unit         string  `json:"unit"`
	BatchRef     string  `json:"batch_ref"`
	ExpiryDate   *time.Time `json:"expiry_date"`
	StockType    string  `json:"stock_type"`
	MovementType string  `json:"movement_type"`
	UnitPrice    float64 `json:"unit_price"`
	LineValue    float64 `json:"line_value"`
	Currency     string  `json:"currency"`
	HUID         *int64  `json:"hu_id"`
	LineNotes    string  `json:"line_notes"`
}

func (r *GRRepository) Create(ctx context.Context, d GRDocument) (int64, error) {
	// Generate GR Number using per-tenant sequence and format
	var format string
	err := r.db.QueryRow(ctx, "SELECT gr_number_format FROM tenant_config WHERE tenant_id = $1", d.TenantID).Scan(&format)
	if err != nil {
		format = "GR-{YEAR}-{SEQ}" // Fallback
	}

	var seq int64
	err = r.db.QueryRow(ctx, "SELECT get_next_sequence($1, 'GR')", d.TenantID).Scan(&seq)
	if err != nil {
		return 0, fmt.Errorf("failed to generate GR sequence: %w", err)
	}

	yearStr := time.Now().Format("2006")
	seqStr := fmt.Sprintf("%05d", seq)
	
	grNumber := format
	grNumber = fmt.Sprintf("%s", strings.ReplaceAll(grNumber, "{YEAR}", yearStr))
	grNumber = strings.ReplaceAll(grNumber, "{SEQ}", seqStr)

	var id int64
	err = r.db.QueryRow(ctx, `
		INSERT INTO gr_documents (
			tenant_id, organisation_id, site_id, zone_id, gr_number, status,
			document_date, posting_date, movement_type, fiscal_year,
			supplier_id, supplier_ref, delivery_note_number, bill_of_lading, notes,
			posted_by, reversal_of_gr_id, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		) RETURNING id
	`, d.TenantID, d.OrganisationID, d.SiteID, d.ZoneID, grNumber, d.Status,
		d.DocumentDate, d.PostingDate, d.MovementType, d.FiscalYear,
		d.SupplierID, d.SupplierRef, d.DeliveryNoteNumber, d.BillOfLading, d.Notes,
		d.PostedBy, d.ReversalOfGRID, d.CreatedBy).Scan(&id)

	return id, err
}

func (r *GRRepository) AddLine(ctx context.Context, line GRLine, grID int64, tenantID int64) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO gr_lines (
			tenant_id, gr_document_id, line_number, product_id, short_text,
			quantity, unit, batch_ref, expiry_date, stock_type, movement_type,
			unit_price, line_value, currency, hu_id, line_notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
		)
	`, tenantID, grID, line.LineNumber, line.ProductID, line.ShortText,
		line.Quantity, line.Unit, line.BatchRef, line.ExpiryDate, line.StockType,
		line.MovementType, line.UnitPrice, line.LineValue, line.Currency, line.HUID, line.LineNotes)
	return err
}

func (r *GRRepository) Post(ctx context.Context, grID int64) error {
	_, err := r.db.Exec(ctx, "UPDATE gr_documents SET status = 'POSTED', posted_at = now() WHERE id = $1", grID)
	return err
}

func (r *GRRepository) GetByID(ctx context.Context, tenantID, grID int64) (GRDocument, error) {
	var d GRDocument
	err := r.db.QueryRow(ctx, `
		SELECT id, public_id, tenant_id, organisation_id, site_id, zone_id, gr_number, status, 
		       document_date, posting_date, movement_type, fiscal_year, supplier_id, 
		       supplier_ref, delivery_note_number, bill_of_lading, notes, posted_at, created_at
		FROM gr_documents
		WHERE id = $1 AND tenant_id = $2
	`, grID, tenantID).Scan(
		&d.ID, &d.PublicID, &d.TenantID, &d.OrganisationID, &d.SiteID, &d.ZoneID, &d.GRNumber, &d.Status,
		&d.DocumentDate, &d.PostingDate, &d.MovementType, &d.FiscalYear, &d.SupplierID,
		&d.SupplierRef, &d.DeliveryNoteNumber, &d.BillOfLading, &d.Notes, &d.PostedAt, &d.CreatedAt)
	return d, err
}

func (r *GRRepository) List(ctx context.Context, tenantID int64, limit, offset int) ([]GRDocument, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, public_id, tenant_id, organisation_id, site_id, zone_id, gr_number, status, 
		       document_date, posting_date, supplier_ref, notes, posted_at, created_at
		FROM gr_documents
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []GRDocument
	for rows.Next() {
		var d GRDocument
		if err := rows.Scan(
			&d.ID, &d.PublicID, &d.TenantID, &d.OrganisationID, &d.SiteID, &d.ZoneID, &d.GRNumber, &d.Status,
			&d.DocumentDate, &d.PostingDate, &d.SupplierRef, &d.Notes, &d.PostedAt, &d.CreatedAt,
		); err == nil {
			docs = append(docs, d)
		}
	}
	return docs, nil
}

func (r *GRRepository) GetDetails(ctx context.Context, grID int64, tenantID int64) ([]GRLine, error) {
	rows, err := r.db.Query(ctx, `
		SELECT l.id, l.public_id, l.product_id, p.name, p.code, l.quantity, l.unit, l.batch_ref, l.hu_id
		FROM gr_lines l
		JOIN products p ON l.product_id = p.id
		WHERE l.gr_document_id = $1 AND l.tenant_id = $2
	`, grID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lines []GRLine
	for rows.Next() {
		var l GRLine
		if err := rows.Scan(&l.ID, &l.PublicID, &l.ProductID, &l.ProductName, &l.ProductCode, &l.Quantity, &l.Unit, &l.BatchRef, &l.HUID); err == nil {
			lines = append(lines, l)
		}
	}
	return lines, nil
}

func (r *GRRepository) GetStats(ctx context.Context, tenantID int64) (map[string]any, error) {
	stats := make(map[string]any)
	
	// Today's count
	var todayCount int
	r.db.QueryRow(ctx, "SELECT COUNT(*) FROM gr_documents WHERE tenant_id = $1 AND created_at >= date_trunc('day', now())", tenantID).Scan(&todayCount)
	stats["today_count"] = todayCount

	// Today's units
	var todayUnits float64
	r.db.QueryRow(ctx, "SELECT COALESCE(SUM(quantity), 0) FROM gr_lines WHERE tenant_id = $1 AND created_at >= date_trunc('day', now())", tenantID).Scan(&todayUnits)
	stats["today_units"] = todayUnits

	// Open putaway tasks
	var openTasks int
	r.db.QueryRow(ctx, "SELECT COUNT(*) FROM warehouse_tasks WHERE tenant_id = $1 AND status = 'OPEN' AND task_type = 'PUTAWAY'", tenantID).Scan(&openTasks)
	stats["open_putaway_tasks"] = openTasks

	// Last GR At
	var lastGRAt *time.Time
	r.db.QueryRow(ctx, "SELECT posted_at FROM gr_documents WHERE tenant_id = $1 AND status = 'POSTED' ORDER BY posted_at DESC LIMIT 1", tenantID).Scan(&lastGRAt)
	stats["last_gr_at"] = lastGRAt

	return stats, nil
}

func (r *GRRepository) GetNextHUCode(ctx context.Context, tenantID int64) (string, error) {
	var huCode string
	err := r.db.QueryRow(ctx, `
		SELECT 'HU-' || to_char(now(), 'YYYY') || '-' || lpad(get_next_sequence($1, 'HU')::text, 5, '0')
	`, tenantID).Scan(&huCode)
	return huCode, err
}
