package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ─────────────────────────────────────────────────────────────
// Handler struct
// ─────────────────────────────────────────────────────────────

type POEnrichHandler struct {
	Pool *pgxpool.Pool
}

func NewPOEnrichHandler(pool *pgxpool.Pool) *POEnrichHandler {
	return &POEnrichHandler{Pool: pool}
}

// ─────────────────────────────────────────────────────────────
// Request / Response types
// ─────────────────────────────────────────────────────────────

type POHeaderEnrichRequest struct {
	CollectiveNo       *string  `json:"collective_no"`
	HeaderText         *string  `json:"header_text"`
	DeliveryTermsText  *string  `json:"delivery_terms_text"`
	WarrantyText       *string  `json:"warranty_text"`
	PenaltyText        *string  `json:"penalty_text"`
	GuaranteeText      *string  `json:"guarantee_text"`
	IncotermsVersion   *string  `json:"incoterms_version"`
	IncotermsLocation1 *string  `json:"incoterms_location1"`
	IncotermsLocation2 *string  `json:"incoterms_location2"`
	GoodsSupplierID    *int64   `json:"goods_supplier_id"`
	InvoicingPartyID   *int64   `json:"invoicing_party_id"`
	FixedExchRate      *bool    `json:"fixed_exch_rate"`
	OutputMedium       *string  `json:"output_medium"`
	DownPaymentPct     *float64 `json:"down_payment_pct"`
	DownPaymentAmt     *float64 `json:"down_payment_amt"`
	DownPaymentDue     *string  `json:"down_payment_due"`
}

type POItemDeliveryRequest struct {
	OverdeliveryTol    float64  `json:"overdelivery_tol"`
	UnderdeliveryTol   float64  `json:"underdelivery_tol"`
	UnlimitedOverdeliv bool     `json:"unlimited_overdeliv"`
	ShippingInstr      string   `json:"shipping_instr"`
	PlannedDelivTime   int      `json:"planned_deliv_time"`
	Reminder1Days      *int     `json:"reminder_1_days"`
	Reminder2Days      *int     `json:"reminder_2_days"`
	Reminder3Days      *int     `json:"reminder_3_days"`
	NoExpeditors       int      `json:"no_expeditors"`
	PlDelivTime        int      `json:"pl_deliv_time"`
	StockType          string   `json:"stock_type"`
	GoodsReceipt       bool     `json:"goods_receipt"`
	GRNonValuated      bool     `json:"gr_non_valuated"`
	DelivCompl         bool     `json:"deliv_compl"`
	RemShelfLife       *int     `json:"rem_shelf_life"`
	QAControlKey       *string  `json:"qa_control_key"`
	CertType           *string  `json:"cert_type"`
	LatestGRDate       *string  `json:"latest_gr_date"`
	PartDelAllowed     bool     `json:"part_del_allowed"`
}

type POItemInvoiceRequest struct {
	InvReceipt   bool   `json:"inv_receipt"`
	FinalInvoice bool   `json:"final_invoice"`
	GRBasedIV    bool   `json:"gr_based_iv"`
	TaxCode      string `json:"tax_code"`
	DPCategory   string `json:"dp_category"`
}

type PODeliveryScheduleLine struct {
	ScheduleLine  int     `json:"schedule_line"`
	DeliveryDate  string  `json:"delivery_date"`
	ScheduledQty  float64 `json:"scheduled_qty"`
	StatDelDate   *string `json:"stat_del_date"`
	PurchaseReqID *int64  `json:"purchase_req_id"`
	ReqItemNo     *int    `json:"req_item_no"`
}

type POConfirmationRequest struct {
	ConfControl       string   `json:"conf_control"`
	SequenceNo        int      `json:"sequence_no"`
	ConfCategory      string   `json:"conf_category"`
	DeliveryDate      *string  `json:"delivery_date"`
	Quantity          *float64 `json:"quantity"`
	Reference         string   `json:"reference"`
	HandoverDate      *string  `json:"handover_date"`
	InboundDeliveryNo string   `json:"inbound_delivery_no"`
	OrderAckReqd      bool     `json:"order_ack_reqd"`
	RejectionInd      bool     `json:"rejection_ind"`
}

type POAccountAssignmentRequest struct {
	AcctAssgtCat   string   `json:"acct_assgt_cat"`
	Distribution   string   `json:"distribution"`
	SequenceNo     int      `json:"sequence_no"`
	GLAccount      string   `json:"gl_account"`
	COArea         string   `json:"co_area"`
	CostCenter     string   `json:"cost_center"`
	SalesOrder     string   `json:"sales_order"`
	SalesOrderItem *int     `json:"sales_order_item"`
	ProjectWBS     string   `json:"project_wbs"`
	Network        string   `json:"network"`
	OrderNo        string   `json:"order_no"`
	AssetNo        string   `json:"asset_no"`
	Quantity       *float64 `json:"quantity"`
	Percentage     *float64 `json:"percentage"`
	NetValue       *float64 `json:"net_value"`
	UnloadingPoint string   `json:"unloading_point"`
	FundedProgram  string   `json:"funded_program"`
	PartialInvoice string   `json:"partial_invoice"`
}

type POBlockRequest struct {
	BlockReasonCode string `json:"block_reason_code" binding:"required"`
	BlockedBy       string `json:"blocked_by"`
}

type POItemConditionRequest struct {
	ConditionType  string  `json:"condition_type" binding:"required"`
	Name           string  `json:"name"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	PerQty         float64 `json:"per_qty"`
	UOM            string  `json:"uom"`
	ConditionValue float64 `json:"condition_value"`
	ConditionClass string  `json:"condition_class"`
	CalcType       string  `json:"calc_type"`
	Inactive       bool    `json:"inactive"`
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

func enrichParsePOID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid po id"})
		return 0, false
	}
	return id, true
}

func enrichParseItemNo(c *gin.Context) (int, bool) {
	n, err := strconv.Atoi(c.Param("item_no"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item_no"})
		return 0, false
	}
	return n, true
}

// ─────────────────────────────────────────────────────────────
// PO Header Enrichment (Texts / Partners / Additional Data)
// ─────────────────────────────────────────────────────────────

// PATCH /api/po/:id/header-enrich
func (h *POEnrichHandler) PatchPOHeaderEnrich(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	var req POHeaderEnrichRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE purchase_orders SET
		  collective_no        = COALESCE($2, collective_no),
		  header_text          = COALESCE($3, header_text),
		  delivery_terms_text  = COALESCE($4, delivery_terms_text),
		  warranty_text        = COALESCE($5, warranty_text),
		  penalty_text         = COALESCE($6, penalty_text),
		  guarantee_text       = COALESCE($7, guarantee_text),
		  incoterms_version    = COALESCE($8, incoterms_version),
		  incoterms_location1  = COALESCE($9, incoterms_location1),
		  incoterms_location2  = COALESCE($10, incoterms_location2),
		  goods_supplier_id    = COALESCE($11, goods_supplier_id),
		  invoicing_party_id   = COALESCE($12, invoicing_party_id),
		  fixed_exch_rate      = COALESCE($13, fixed_exch_rate),
		  output_medium        = COALESCE($14, output_medium),
		  down_payment_pct     = COALESCE($15, down_payment_pct),
		  down_payment_amt     = COALESCE($16, down_payment_amt),
		  updated_at           = NOW()
		WHERE id = $1`,
		poID,
		req.CollectiveNo, req.HeaderText, req.DeliveryTermsText,
		req.WarrantyText, req.PenaltyText, req.GuaranteeText,
		req.IncotermsVersion, req.IncotermsLocation1, req.IncotermsLocation2,
		req.GoodsSupplierID, req.InvoicingPartyID,
		req.FixedExchRate, req.OutputMedium,
		req.DownPaymentPct, req.DownPaymentAmt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PO header updated"})
}

// GET /api/po/:id/status
func (h *POEnrichHandler) GetPOStatus(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT item_no, ordered_qty, order_unit, currency,
		       delivered_qty, still_to_deliver_qty,
		       invoiced_qty, still_to_deliver_val,
		       output_sent, output_sent_at
		FROM po_status_summary
		WHERE po_id = $1
		ORDER BY item_no`, poID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type StatusLine struct {
		ItemNo            int     `json:"item_no"`
		OrderedQty        float64 `json:"ordered_qty"`
		OrderUnit         string  `json:"order_unit"`
		Currency          string  `json:"currency"`
		DeliveredQty      float64 `json:"delivered_qty"`
		StillToDeliverQty float64 `json:"still_to_deliver_qty"`
		InvoicedQty       float64 `json:"invoiced_qty"`
		StillToDeliverVal float64 `json:"still_to_deliver_val"`
		OutputSent        bool    `json:"output_sent"`
		OutputSentAt      *string `json:"output_sent_at,omitempty"`
	}
	var lines []StatusLine
	for rows.Next() {
		var l StatusLine
		var sentAt *time.Time
		if err := rows.Scan(
			&l.ItemNo, &l.OrderedQty, &l.OrderUnit, &l.Currency,
			&l.DeliveredQty, &l.StillToDeliverQty,
			&l.InvoicedQty, &l.StillToDeliverVal,
			&l.OutputSent, &sentAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if sentAt != nil {
			s := sentAt.Format(time.RFC3339)
			l.OutputSentAt = &s
		}
		lines = append(lines, l)
	}
	c.JSON(http.StatusOK, gin.H{"status_lines": lines})
}

// ─────────────────────────────────────────────────────────────
// Item Delivery Tab
// ─────────────────────────────────────────────────────────────

// GET  /api/po/:id/items/:item_no/delivery
func (h *POEnrichHandler) GetItemDelivery(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var d POItemDeliveryRequest
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT overdelivery_tol, underdelivery_tol, unlimited_overdeliv,
		       COALESCE(shipping_instr,''), COALESCE(planned_deliv_time,0),
		       reminder_1_days, reminder_2_days, reminder_3_days,
		       no_expeditors, pl_deliv_time, stock_type,
		       goods_receipt, gr_non_valuated, deliv_compl,
		       rem_shelf_life, qa_control_key, cert_type,
		       latest_gr_date::text, part_del_allowed
		FROM po_item_delivery
		WHERE po_id = $1 AND item_no = $2`, poID, itemNo).Scan(
		&d.OverdeliveryTol, &d.UnderdeliveryTol, &d.UnlimitedOverdeliv,
		&d.ShippingInstr, &d.PlannedDelivTime,
		&d.Reminder1Days, &d.Reminder2Days, &d.Reminder3Days,
		&d.NoExpeditors, &d.PlDelivTime, &d.StockType,
		&d.GoodsReceipt, &d.GRNonValuated, &d.DelivCompl,
		&d.RemShelfLife, &d.QAControlKey, &d.CertType,
		&d.LatestGRDate, &d.PartDelAllowed,
	)
	if err == pgx.ErrNoRows {
		d = POItemDeliveryRequest{GoodsReceipt: true, PartDelAllowed: true, StockType: "unrestricted"}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, d)
}

// PUT  /api/po/:id/items/:item_no/delivery
func (h *POEnrichHandler) UpsertItemDelivery(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var req POItemDeliveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO po_item_delivery
		  (po_id, item_no, overdelivery_tol, underdelivery_tol, unlimited_overdeliv,
		   shipping_instr, planned_deliv_time,
		   reminder_1_days, reminder_2_days, reminder_3_days,
		   no_expeditors, pl_deliv_time, stock_type,
		   goods_receipt, gr_non_valuated, deliv_compl,
		   rem_shelf_life, qa_control_key, cert_type, latest_gr_date, part_del_allowed,
		   updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
		ON CONFLICT (po_id, item_no) DO UPDATE SET
		  overdelivery_tol    = EXCLUDED.overdelivery_tol,
		  underdelivery_tol   = EXCLUDED.underdelivery_tol,
		  unlimited_overdeliv = EXCLUDED.unlimited_overdeliv,
		  shipping_instr      = EXCLUDED.shipping_instr,
		  planned_deliv_time  = EXCLUDED.planned_deliv_time,
		  reminder_1_days     = EXCLUDED.reminder_1_days,
		  reminder_2_days     = EXCLUDED.reminder_2_days,
		  reminder_3_days     = EXCLUDED.reminder_3_days,
		  no_expeditors       = EXCLUDED.no_expeditors,
		  pl_deliv_time       = EXCLUDED.pl_deliv_time,
		  stock_type          = EXCLUDED.stock_type,
		  goods_receipt       = EXCLUDED.goods_receipt,
		  gr_non_valuated     = EXCLUDED.gr_non_valuated,
		  deliv_compl         = EXCLUDED.deliv_compl,
		  rem_shelf_life      = EXCLUDED.rem_shelf_life,
		  qa_control_key      = EXCLUDED.qa_control_key,
		  cert_type           = EXCLUDED.cert_type,
		  latest_gr_date      = EXCLUDED.latest_gr_date,
		  part_del_allowed    = EXCLUDED.part_del_allowed,
		  updated_at          = NOW()`,
		poID, itemNo,
		req.OverdeliveryTol, req.UnderdeliveryTol, req.UnlimitedOverdeliv,
		req.ShippingInstr, req.PlannedDelivTime,
		req.Reminder1Days, req.Reminder2Days, req.Reminder3Days,
		req.NoExpeditors, req.PlDelivTime, req.StockType,
		req.GoodsReceipt, req.GRNonValuated, req.DelivCompl,
		req.RemShelfLife, req.QAControlKey, req.CertType, req.LatestGRDate, req.PartDelAllowed,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "delivery settings saved"})
}

// ─────────────────────────────────────────────────────────────
// Item Invoice Tab
// ─────────────────────────────────────────────────────────────

// GET  /api/po/:id/items/:item_no/invoice
func (h *POEnrichHandler) GetItemInvoice(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var d POItemInvoiceRequest
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT inv_receipt, final_invoice, gr_based_iv,
		       COALESCE(tax_code,''), COALESCE(dp_category,'')
		FROM po_item_invoice
		WHERE po_id = $1 AND item_no = $2`, poID, itemNo).Scan(
		&d.InvReceipt, &d.FinalInvoice, &d.GRBasedIV, &d.TaxCode, &d.DPCategory,
	)
	if err == pgx.ErrNoRows {
		d = POItemInvoiceRequest{InvReceipt: true, GRBasedIV: true}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, d)
}

// PUT  /api/po/:id/items/:item_no/invoice
func (h *POEnrichHandler) UpsertItemInvoice(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var req POItemInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO po_item_invoice
		  (po_id, item_no, inv_receipt, final_invoice, gr_based_iv, tax_code, dp_category, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
		ON CONFLICT (po_id, item_no) DO UPDATE SET
		  inv_receipt   = EXCLUDED.inv_receipt,
		  final_invoice = EXCLUDED.final_invoice,
		  gr_based_iv   = EXCLUDED.gr_based_iv,
		  tax_code      = EXCLUDED.tax_code,
		  dp_category   = EXCLUDED.dp_category,
		  updated_at    = NOW()`,
		poID, itemNo, req.InvReceipt, req.FinalInvoice, req.GRBasedIV, req.TaxCode, req.DPCategory,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "invoice settings saved"})
}

// ─────────────────────────────────────────────────────────────
// Delivery Schedule Tab
// ─────────────────────────────────────────────────────────────

// GET  /api/po/:id/items/:item_no/delivery-schedule
func (h *POEnrichHandler) GetDeliverySchedule(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT schedule_line, delivery_date::text, scheduled_qty,
		       stat_del_date::text, gr_qty,
		       COALESCE(open_qty, scheduled_qty - gr_qty),
		       purchase_req_id, req_item_no
		FROM po_delivery_schedule
		WHERE po_id = $1 AND item_no = $2
		ORDER BY schedule_line`, poID, itemNo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type SchedLine struct {
		ScheduleLine  int     `json:"schedule_line"`
		DeliveryDate  string  `json:"delivery_date"`
		ScheduledQty  float64 `json:"scheduled_qty"`
		StatDelDate   *string `json:"stat_del_date,omitempty"`
		GRQty         float64 `json:"gr_qty"`
		OpenQty       float64 `json:"open_qty"`
		PurchaseReqID *int64  `json:"purchase_req_id,omitempty"`
		ReqItemNo     *int    `json:"req_item_no,omitempty"`
	}
	var lines []SchedLine
	for rows.Next() {
		var l SchedLine
		if err := rows.Scan(
			&l.ScheduleLine, &l.DeliveryDate, &l.ScheduledQty,
			&l.StatDelDate, &l.GRQty, &l.OpenQty, &l.PurchaseReqID, &l.ReqItemNo,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		lines = append(lines, l)
	}
	c.JSON(http.StatusOK, gin.H{"schedule_lines": lines})
}

// PUT  /api/po/:id/items/:item_no/delivery-schedule
func (h *POEnrichHandler) UpsertDeliverySchedule(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var req struct {
		Lines []PODeliveryScheduleLine `json:"lines" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := h.Pool.BeginTx(c.Request.Context(), pgx.TxOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(context.Background())

	if _, err := tx.Exec(c.Request.Context(),
		`DELETE FROM po_delivery_schedule WHERE po_id = $1 AND item_no = $2`,
		poID, itemNo,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, l := range req.Lines {
		if _, err := tx.Exec(c.Request.Context(), `
			INSERT INTO po_delivery_schedule
			  (po_id, item_no, schedule_line, delivery_date, scheduled_qty,
			   stat_del_date, purchase_req_id, req_item_no, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
			poID, itemNo, l.ScheduleLine, l.DeliveryDate, l.ScheduledQty,
			l.StatDelDate, l.PurchaseReqID, l.ReqItemNo,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	if err := tx.Commit(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "delivery schedule saved", "lines": len(req.Lines)})
}

// ─────────────────────────────────────────────────────────────
// Confirmations Tab
// ─────────────────────────────────────────────────────────────

// GET  /api/po/:id/items/:item_no/confirmations
func (h *POEnrichHandler) GetItemConfirmations(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT conf_control, sequence_no, COALESCE(conf_category,''),
		       delivery_date::text, quantity, COALESCE(reference,''),
		       handover_date::text, COALESCE(inbound_delivery_no,''),
		       order_ack_reqd, rejection_ind
		FROM po_item_confirmation
		WHERE po_id = $1 AND item_no = $2
		ORDER BY sequence_no`, poID, itemNo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var confs []POConfirmationRequest
	for rows.Next() {
		var cf POConfirmationRequest
		if err := rows.Scan(
			&cf.ConfControl, &cf.SequenceNo, &cf.ConfCategory,
			&cf.DeliveryDate, &cf.Quantity, &cf.Reference,
			&cf.HandoverDate, &cf.InboundDeliveryNo,
			&cf.OrderAckReqd, &cf.RejectionInd,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		confs = append(confs, cf)
	}
	c.JSON(http.StatusOK, gin.H{"confirmations": confs})
}

// POST /api/po/:id/items/:item_no/confirmations
func (h *POEnrichHandler) AddItemConfirmation(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var req POConfirmationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err := h.Pool.Exec(c.Request.Context(), `
		INSERT INTO po_item_confirmation
		  (po_id, item_no, conf_control, sequence_no, conf_category,
		   delivery_date, quantity, reference, handover_date,
		   inbound_delivery_no, order_ack_reqd, rejection_ind)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		poID, itemNo,
		req.ConfControl, req.SequenceNo, req.ConfCategory,
		req.DeliveryDate, req.Quantity, req.Reference, req.HandoverDate,
		req.InboundDeliveryNo, req.OrderAckReqd, req.RejectionInd,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "confirmation recorded"})
}

// ─────────────────────────────────────────────────────────────
// Block / Unblock / Cancel Item
// ─────────────────────────────────────────────────────────────

// POST /api/po/:id/items/:item_no/block
func (h *POEnrichHandler) BlockItem(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var req POBlockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE purchase_order_lines
		SET blocked = true, block_reason_code = $3, blocked_at = NOW(), blocked_by = $4
		WHERE po_id = $1 AND item_no = $2 AND deleted = false`,
		poID, itemNo, req.BlockReasonCode, req.BlockedBy,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "item blocked"})
}

// POST /api/po/:id/items/:item_no/unblock
func (h *POEnrichHandler) UnblockItem(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE purchase_order_lines
		SET blocked = false, block_reason_code = NULL, blocked_at = NULL, blocked_by = NULL
		WHERE po_id = $1 AND item_no = $2`,
		poID, itemNo,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "item unblocked"})
}

// DELETE /api/po/:id/items/:item_no
func (h *POEnrichHandler) DeleteItem(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	deletedBy := c.Query("deleted_by")

	// Cannot delete if GR already posted (gr_qty > 0)
	var grQty float64
	_ = h.Pool.QueryRow(c.Request.Context(), `
		SELECT COALESCE(SUM(gr_qty),0)
		FROM po_delivery_schedule
		WHERE po_id = $1 AND item_no = $2`, poID, itemNo).Scan(&grQty)
	if grQty > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":  "cannot delete item: goods receipt already posted against this line",
			"gr_qty": grQty,
		})
		return
	}

	_, err := h.Pool.Exec(c.Request.Context(), `
		UPDATE purchase_order_lines
		SET deleted = true, deleted_at = NOW(), deleted_by = $3
		WHERE po_id = $1 AND item_no = $2`,
		poID, itemNo, deletedBy,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "item deleted (soft)"})
}

// ─────────────────────────────────────────────────────────────
// Account Assignment Tab
// ─────────────────────────────────────────────────────────────

// GET  /api/po/:id/items/:item_no/account-assignments
func (h *POEnrichHandler) GetAccountAssignments(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT acct_assgt_cat, distribution, sequence_no,
		       COALESCE(gl_account,''), COALESCE(co_area,''),
		       COALESCE(cost_center,''), COALESCE(sales_order,''),
		       sales_order_item, COALESCE(project_wbs,''),
		       COALESCE(network,''), COALESCE(order_no,''),
		       quantity, percentage, net_value,
		       COALESCE(unloading_point,''), COALESCE(funded_program,''),
		       COALESCE(partial_invoice,'1')
		FROM po_account_assignments
		WHERE po_id = $1 AND item_no = $2
		ORDER BY sequence_no`, poID, itemNo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var assignments []POAccountAssignmentRequest
	for rows.Next() {
		var a POAccountAssignmentRequest
		if err := rows.Scan(
			&a.AcctAssgtCat, &a.Distribution, &a.SequenceNo,
			&a.GLAccount, &a.COArea, &a.CostCenter, &a.SalesOrder,
			&a.SalesOrderItem, &a.ProjectWBS, &a.Network, &a.OrderNo,
			&a.Quantity, &a.Percentage, &a.NetValue,
			&a.UnloadingPoint, &a.FundedProgram, &a.PartialInvoice,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		assignments = append(assignments, a)
	}
	c.JSON(http.StatusOK, gin.H{"assignments": assignments})
}

// PUT  /api/po/:id/items/:item_no/account-assignments
func (h *POEnrichHandler) UpsertAccountAssignments(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var req struct {
		Assignments []POAccountAssignmentRequest `json:"assignments" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate percentages add up to 100 (if distribution = 2)
	if len(req.Assignments) > 0 && req.Assignments[0].Distribution == "2" {
		var total float64
		for _, a := range req.Assignments {
			if a.Percentage != nil {
				total += *a.Percentage
			}
		}
		if total > 100.01 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "percentages exceed 100%",
				"total": total,
			})
			return
		}
	}

	tx, err := h.Pool.BeginTx(c.Request.Context(), pgx.TxOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(context.Background())

	if _, err := tx.Exec(c.Request.Context(),
		`DELETE FROM po_account_assignments WHERE po_id=$1 AND item_no=$2`,
		poID, itemNo,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, a := range req.Assignments {
		if _, err := tx.Exec(c.Request.Context(), `
			INSERT INTO po_account_assignments
			  (po_id, item_no, acct_assgt_cat, distribution, sequence_no,
			   gl_account, co_area, cost_center, sales_order, sales_order_item,
			   project_wbs, network, order_no,
			   quantity, percentage, net_value,
			   unloading_point, funded_program, partial_invoice, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW())`,
			poID, itemNo,
			a.AcctAssgtCat, a.Distribution, a.SequenceNo,
			a.GLAccount, a.COArea, a.CostCenter, a.SalesOrder, a.SalesOrderItem,
			a.ProjectWBS, a.Network, a.OrderNo,
			a.Quantity, a.Percentage, a.NetValue,
			a.UnloadingPoint, a.FundedProgram, a.PartialInvoice,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	tx.Commit(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{"message": "account assignments saved"})
}

// ─────────────────────────────────────────────────────────────
// Conditions Tab (item pricing)
// ─────────────────────────────────────────────────────────────

// GET  /api/po/:id/items/:item_no/conditions
func (h *POEnrichHandler) GetItemConditions(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT c.condition_type, COALESCE(ct.description, c.name, ''),
		       c.amount, COALESCE(c.currency,''), COALESCE(c.per_qty,1), COALESCE(c.uom,''),
		       COALESCE(c.condition_value,0), COALESCE(ct.condition_class,''),
		       COALESCE(ct.calc_type,''), c.inactive
		FROM po_item_conditions c
		LEFT JOIN pricing_condition_types ct ON ct.code = c.condition_type
		WHERE c.po_id = $1 AND c.item_no = $2
		ORDER BY c.condition_type`, poID, itemNo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var conds []POItemConditionRequest
	for rows.Next() {
		var co POItemConditionRequest
		if err := rows.Scan(
			&co.ConditionType, &co.Name, &co.Amount, &co.Currency,
			&co.PerQty, &co.UOM, &co.ConditionValue, &co.ConditionClass, &co.CalcType, &co.Inactive,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		conds = append(conds, co)
	}
	c.JSON(http.StatusOK, gin.H{"conditions": conds})
}

// PUT  /api/po/:id/items/:item_no/conditions
func (h *POEnrichHandler) UpsertItemConditions(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	itemNo, ok := enrichParseItemNo(c)
	if !ok {
		return
	}
	var req struct {
		Conditions []POItemConditionRequest `json:"conditions" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tx, err := h.Pool.BeginTx(c.Request.Context(), pgx.TxOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback(context.Background())

	tx.Exec(c.Request.Context(), `DELETE FROM po_item_conditions WHERE po_id=$1 AND item_no=$2`, poID, itemNo)
	for _, co := range req.Conditions {
		tx.Exec(c.Request.Context(), `
			INSERT INTO po_item_conditions
			  (po_id, item_no, condition_type, name, amount, currency,
			   per_qty, uom, condition_value, condition_class, calc_type, inactive)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
			poID, itemNo,
			co.ConditionType, co.Name, co.Amount, co.Currency,
			co.PerQty, co.UOM, co.ConditionValue, co.ConditionClass, co.CalcType, co.Inactive,
		)
	}
	tx.Commit(c.Request.Context())
	c.JSON(http.StatusOK, gin.H{"message": "conditions saved"})
}

// ─────────────────────────────────────────────────────────────
// Block reasons reference list
// ─────────────────────────────────────────────────────────────

// GET /api/po/block-reasons
func (h *POEnrichHandler) ListBlockReasons(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `SELECT code, description FROM po_block_reasons ORDER BY code`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	type BR struct {
		Code        string `json:"code"`
		Description string `json:"description"`
	}
	var reasons []BR
	for rows.Next() {
		var r BR
		rows.Scan(&r.Code, &r.Description)
		reasons = append(reasons, r)
	}
	c.JSON(http.StatusOK, gin.H{"block_reasons": reasons})
}

// GET /api/po/condition-types
func (h *POEnrichHandler) ListConditionTypes(c *gin.Context) {
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT code, description, condition_class, calc_type, plus_minus
		FROM pricing_condition_types
		WHERE active = true ORDER BY code`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	type CT struct {
		Code           string `json:"code"`
		Description    string `json:"description"`
		ConditionClass string `json:"condition_class"`
		CalcType       string `json:"calc_type"`
		PlusMinus      string `json:"plus_minus"`
	}
	var types []CT
	for rows.Next() {
		var t CT
		rows.Scan(&t.Code, &t.Description, &t.ConditionClass, &t.CalcType, &t.PlusMinus)
		types = append(types, t)
	}
	c.JSON(http.StatusOK, gin.H{"condition_types": types})
}

// ─────────────────────────────────────────────────────────────
// PO Output / Print
// ─────────────────────────────────────────────────────────────

// POST /api/po/:id/output
func (h *POEnrichHandler) TriggerPOOutput(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	var req struct {
		Medium          string `json:"medium"`           // 1=print,5=email,6=EDI
		PartnerFunction string `json:"partner_function"` // VN,OA,DP...
		Language        string `json:"language"`
		RepeatOutput    bool   `json:"repeat_output"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Medium == "" {
		req.Medium = "1"
	}
	if req.Language == "" {
		req.Language = "EN"
	}

	// Log the output request
	var msgID int64
	err := h.Pool.QueryRow(c.Request.Context(), `
		INSERT INTO po_output_messages
		  (po_id, output_type, medium, partner_function, language, status)
		VALUES ($1, 'NEU', $2, $3, $4, '0')
		RETURNING id`,
		poID, req.Medium, req.PartnerFunction, req.Language,
	).Scan(&msgID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Mark PO as output-sent
	h.Pool.Exec(c.Request.Context(), `
		UPDATE purchase_orders
		SET output_sent = true, output_sent_at = NOW(), output_medium = $2
		WHERE id = $1`, poID, req.Medium)

	// Update message status to sent
	h.Pool.Exec(c.Request.Context(), `
		UPDATE po_output_messages
		SET status = '1', sent_at = NOW()
		WHERE id = $1`, msgID)

	c.JSON(http.StatusOK, gin.H{
		"message":    "PO output triggered",
		"message_id": msgID,
		"medium":     req.Medium,
		"status":     "sent",
	})
}

// GET /api/po/:id/output-log
func (h *POEnrichHandler) GetOutputLog(c *gin.Context) {
	poID, ok := enrichParsePOID(c)
	if !ok {
		return
	}
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT id, output_type, medium, partner_function, language, status, spool_no, sent_at, created_at
		FROM po_output_messages WHERE po_id = $1 ORDER BY created_at DESC`, poID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type OutputMsg struct {
		ID              int64   `json:"id"`
		OutputType      string  `json:"output_type"`
		Medium          string  `json:"medium"`
		PartnerFunction string  `json:"partner_function"`
		Language        string  `json:"language"`
		Status          string  `json:"status"`
		SpoolNo         *string `json:"spool_no,omitempty"`
		SentAt          *string `json:"sent_at,omitempty"`
		CreatedAt       string  `json:"created_at"`
	}
	var msgs []OutputMsg
	for rows.Next() {
		var m OutputMsg
		var sentAt *time.Time
		var createdAt time.Time
		if err := rows.Scan(
			&m.ID, &m.OutputType, &m.Medium, &m.PartnerFunction,
			&m.Language, &m.Status, &m.SpoolNo, &sentAt, &createdAt,
		); err != nil {
			continue
		}
		if sentAt != nil {
			s := sentAt.Format(time.RFC3339)
			m.SentAt = &s
		}
		m.CreatedAt = createdAt.Format(time.RFC3339)
		msgs = append(msgs, m)
	}
	c.JSON(http.StatusOK, gin.H{"output_messages": msgs})
}

// ─────────────────────────────────────────────────────────────
// RegisterPOEnrichRoutes wires all endpoints into the Gin router.
// Call from router.go: h := handlers.NewPOEnrichHandler(pool); h.RegisterPOEnrichRoutes(api)
// ─────────────────────────────────────────────────────────────
func (h *POEnrichHandler) RegisterPOEnrichRoutes(r *gin.RouterGroup) {
	// Reference data
	r.GET("/po/block-reasons",   h.ListBlockReasons)
	r.GET("/po/condition-types", h.ListConditionTypes)

	// PO-level
	r.PATCH("/po/:id/header-enrich", h.PatchPOHeaderEnrich)
	r.GET("/po/:id/status",          h.GetPOStatus)
	r.POST("/po/:id/output",         h.TriggerPOOutput)
	r.GET("/po/:id/output-log",      h.GetOutputLog)

	// Item-level tabs
	r.GET("/po/:id/items/:item_no/delivery",           h.GetItemDelivery)
	r.PUT("/po/:id/items/:item_no/delivery",           h.UpsertItemDelivery)

	r.GET("/po/:id/items/:item_no/invoice",            h.GetItemInvoice)
	r.PUT("/po/:id/items/:item_no/invoice",            h.UpsertItemInvoice)

	r.GET("/po/:id/items/:item_no/delivery-schedule",  h.GetDeliverySchedule)
	r.PUT("/po/:id/items/:item_no/delivery-schedule",  h.UpsertDeliverySchedule)

	r.GET("/po/:id/items/:item_no/confirmations",      h.GetItemConfirmations)
	r.POST("/po/:id/items/:item_no/confirmations",     h.AddItemConfirmation)

	r.GET("/po/:id/items/:item_no/account-assignments", h.GetAccountAssignments)
	r.PUT("/po/:id/items/:item_no/account-assignments", h.UpsertAccountAssignments)

	r.GET("/po/:id/items/:item_no/conditions",         h.GetItemConditions)
	r.PUT("/po/:id/items/:item_no/conditions",         h.UpsertItemConditions)

	// Block / Cancel
	r.POST("/po/:id/items/:item_no/block",             h.BlockItem)
	r.POST("/po/:id/items/:item_no/unblock",           h.UnblockItem)
	r.DELETE("/po/:id/items/:item_no",                 h.DeleteItem)
}
