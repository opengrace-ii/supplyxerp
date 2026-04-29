package repository

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type GIRepository struct {
	db DBTX
}

type GIDocument struct {
	ID             int64      `json:"id"`
	PublicID       string     `json:"public_id"`
	TenantID       int64      `json:"tenant_id"`
	OrganisationID int64      `json:"organisation_id"`
	SiteID         int64      `json:"site_id"`
	ZoneID         int64      `json:"zone_id"`
	GINumber       string     `json:"gi_number"`
	Status         string     `json:"status"`
	DocumentDate   time.Time  `json:"document_date"`
	PostingDate    time.Time  `json:"posting_date"`
	MovementType   string     `json:"movement_type"`
	FiscalYear     int        `json:"fiscal_year"`
	ReasonCode     string     `json:"reason_code"`
	ReasonText     string     `json:"reason_text"`
	CostCentre     string     `json:"cost_centre"`
	ReferenceType  string     `json:"reference_type"`
	ReferenceID    *int64     `json:"reference_id"`
	Notes          string     `json:"notes"`
	PostedAt       *time.Time `json:"posted_at"`
	PostedBy       *int64     `json:"posted_by"`
	CreatedBy      *int64     `json:"created_by"`
	CreatedAt      time.Time  `json:"created_at"`
}

type GILine struct {
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
	StockType    string  `json:"stock_type"`
	MovementType string  `json:"movement_type"`
	HUID         *int64  `json:"hu_id"`
	LineNotes    string  `json:"line_notes"`
}

func (r *GIRepository) Create(ctx context.Context, d GIDocument) (int64, error) {
	// Generate GI Number using per-tenant sequence
	var seq int64
	err := r.db.QueryRow(ctx, "SELECT get_next_sequence($1, 'GI')", d.TenantID).Scan(&seq)
	if err != nil {
		return 0, fmt.Errorf("failed to generate GI sequence: %w", err)
	}

	yearStr := time.Now().Format("2006")
	seqStr := fmt.Sprintf("%05d", seq)
	giNumber := fmt.Sprintf("GI-%s-%s", yearStr, seqStr)

	var id int64
	err = r.db.QueryRow(ctx, `
		INSERT INTO gi_documents (
			tenant_id, organisation_id, site_id, zone_id, gi_number, status,
			document_date, posting_date, movement_type, fiscal_year,
			reason_code, reason_text, cost_centre, reference_type, reference_id,
			notes, posted_by, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		) RETURNING id
	`, d.TenantID, d.OrganisationID, d.SiteID, d.ZoneID, giNumber, d.Status,
		d.DocumentDate, d.PostingDate, d.MovementType, d.FiscalYear,
		d.ReasonCode, d.ReasonText, d.CostCentre, d.ReferenceType, d.ReferenceID,
		d.Notes, d.PostedBy, d.CreatedBy).Scan(&id)

	return id, err
}

func (r *GIRepository) AddLine(ctx context.Context, line GILine, giID int64, tenantID int64) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO gi_lines (
			tenant_id, gi_document_id, line_number, product_id, short_text,
			quantity, unit, batch_ref, stock_type, movement_type,
			hu_id, line_notes
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)
	`, tenantID, giID, line.LineNumber, line.ProductID, line.ShortText,
		line.Quantity, line.Unit, line.BatchRef, line.StockType,
		line.MovementType, line.HUID, line.LineNotes)
	return err
}

func (r *GIRepository) Post(ctx context.Context, giID int64) error {
	_, err := r.db.Exec(ctx, "UPDATE gi_documents SET status = 'POSTED', posted_at = now() WHERE id = $1", giID)
	return err
}

func (r *GIRepository) GetByID(ctx context.Context, tenantID, giID int64) (GIDocument, error) {
	var d GIDocument
	err := r.db.QueryRow(ctx, `
		SELECT id, public_id::text, tenant_id, organisation_id, site_id, zone_id, gi_number, status, 
		       document_date, posting_date, movement_type, fiscal_year,
		       COALESCE(reason_code, ''), COALESCE(reason_text, ''),
		       COALESCE(cost_centre, ''), COALESCE(reference_type, ''),
		       reference_id, COALESCE(notes, ''), posted_at, created_at
		FROM gi_documents
		WHERE id = $1 AND tenant_id = $2
	`, giID, tenantID).Scan(
		&d.ID, &d.PublicID, &d.TenantID, &d.OrganisationID, &d.SiteID, &d.ZoneID, &d.GINumber, &d.Status,
		&d.DocumentDate, &d.PostingDate, &d.MovementType, &d.FiscalYear,
		&d.ReasonCode, &d.ReasonText, &d.CostCentre, &d.ReferenceType,
		&d.ReferenceID, &d.Notes, &d.PostedAt, &d.CreatedAt)
	return d, err
}

func (r *GIRepository) List(ctx context.Context, tenantID int64, movementType string, limit, offset int) ([]GIDocument, error) {
	where := "WHERE tenant_id = $1"
	args := []any{tenantID}

	if movementType != "" && movementType != "ALL" {
		where += fmt.Sprintf(" AND movement_type = $%d", len(args)+1)
		args = append(args, movementType)
	}

	query := fmt.Sprintf(`
		SELECT id, public_id::text, tenant_id, organisation_id, site_id, zone_id, gi_number, status,
		       document_date, posting_date, movement_type,
		       COALESCE(reason_code, ''), COALESCE(reason_text, ''),
		       COALESCE(notes, ''), posted_at, created_at
		FROM gi_documents
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, len(args)+1, len(args)+2)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []GIDocument
	for rows.Next() {
		var d GIDocument
		if err := rows.Scan(
			&d.ID, &d.PublicID, &d.TenantID, &d.OrganisationID, &d.SiteID, &d.ZoneID, &d.GINumber, &d.Status,
			&d.DocumentDate, &d.PostingDate, &d.MovementType,
			&d.ReasonCode, &d.ReasonText, &d.Notes, &d.PostedAt, &d.CreatedAt,
		); err == nil {
			docs = append(docs, d)
		}
	}
	return docs, nil
}

func (r *GIRepository) GetLines(ctx context.Context, giID int64, tenantID int64) ([]GILine, error) {
	rows, err := r.db.Query(ctx, `
		SELECT l.id, l.public_id::text, l.line_number, l.product_id, p.name, p.code,
		       COALESCE(l.short_text, ''), l.quantity, l.unit,
		       COALESCE(l.batch_ref, ''), l.stock_type, l.movement_type, l.hu_id,
		       COALESCE(l.line_notes, '')
		FROM gi_lines l
		JOIN products p ON l.product_id = p.id
		WHERE l.gi_document_id = $1 AND l.tenant_id = $2
		ORDER BY l.line_number
	`, giID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lines []GILine
	for rows.Next() {
		var l GILine
		if err := rows.Scan(&l.ID, &l.PublicID, &l.LineNumber, &l.ProductID, &l.ProductName, &l.ProductCode,
			&l.ShortText, &l.Quantity, &l.Unit, &l.BatchRef, &l.StockType, &l.MovementType, &l.HUID,
			&l.LineNotes); err == nil {
			lines = append(lines, l)
		}
	}
	return lines, nil
}

func (r *GIRepository) GetStats(ctx context.Context, tenantID int64) (map[string]any, error) {
	stats := make(map[string]any)

	var todayCount int
	r.db.QueryRow(ctx, "SELECT COUNT(*) FROM gi_documents WHERE tenant_id = $1 AND created_at >= date_trunc('day', now())", tenantID).Scan(&todayCount)
	stats["today_count"] = todayCount

	var todayUnits float64
	r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(l.quantity), 0) 
		FROM gi_lines l 
		JOIN gi_documents d ON d.id = l.gi_document_id 
		WHERE d.tenant_id = $1 AND d.created_at >= date_trunc('day', now())
	`, tenantID).Scan(&todayUnits)
	stats["today_units"] = todayUnits

	// Breakdown by movement type
	rows, _ := r.db.Query(ctx, `
		SELECT movement_type, COUNT(*) 
		FROM gi_documents 
		WHERE tenant_id = $1 AND status = 'POSTED'
		GROUP BY movement_type
	`, tenantID)
	if rows != nil {
		defer rows.Close()
		breakdown := make(map[string]int)
		for rows.Next() {
			var mt string
			var cnt int
			if rows.Scan(&mt, &cnt) == nil {
				breakdown[mt] = cnt
			}
		}
		stats["by_movement_type"] = breakdown
	}

	var lastGIAt *time.Time
	r.db.QueryRow(ctx, "SELECT posted_at FROM gi_documents WHERE tenant_id = $1 AND status = 'POSTED' ORDER BY posted_at DESC LIMIT 1", tenantID).Scan(&lastGIAt)
	stats["last_gi_at"] = lastGIAt

	return stats, nil
}

// MovementTypeLabel returns a human-readable name for the GI movement type
func MovementTypeLabel(code string) string {
	labels := map[string]string{
		"261": "Issue to Production",
		"551": "Scrap / Write-off",
		"601": "Issue for Sales Delivery",
	}
	if l, ok := labels[code]; ok {
		return l
	}
	return strings.Title(strings.ToLower(code))
}
