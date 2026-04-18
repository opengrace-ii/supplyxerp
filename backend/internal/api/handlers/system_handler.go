package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SystemHandler struct {
	Pool *pgxpool.Pool
}

func NewSystemHandler(pool *pgxpool.Pool) *SystemHandler {
	return &SystemHandler{Pool: pool}
}

func (h *SystemHandler) GetLogs(c *gin.Context) {
	limit := 200
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n <= 1000 {
			limit = n
		}
	}
	from := time.Now().Add(-24 * time.Hour)
	if f := c.Query("from"); f != "" {
		if t, err := time.Parse(time.RFC3339, f); err == nil {
			from = t
		}
	}

	query := `
		SELECT id, created_at, level, category, method, path,
		       status_code, duration_ms, user_id, ip_address,
		       COALESCE(error_message,''), COALESCE(module,''),
		       COALESCE(function_name,'')
		FROM system_logs
		WHERE created_at >= $1
	`
	args := []interface{}{from}
	argN := 2

	if level := c.Query("level"); level != "" {
		query += fmt.Sprintf(" AND level = $%d", argN)
		args = append(args, level)
		argN++
	}
	if module := c.Query("module"); module != "" {
		query += fmt.Sprintf(" AND module = $%d", argN)
		args = append(args, module)
		argN++
	}
	if search := c.Query("search"); search != "" {
		query += fmt.Sprintf(
			" AND (path ILIKE $%d OR error_message ILIKE $%d)",
			argN, argN)
		args = append(args, "%" + search + "%")
		argN++
	}
	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", argN)
	args = append(args, limit)

	rows, err := h.Pool.Query(c.Request.Context(), query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type LogRow struct {
		ID           int64     `json:"id"`
		CreatedAt    time.Time `json:"created_at"`
		Level        string    `json:"level"`
		Category     string    `json:"category"`
		Method       string    `json:"method"`
		Path         string    `json:"path"`
		StatusCode   int       `json:"status_code"`
		DurationMs   int       `json:"duration_ms"`
		UserID       string    `json:"user_id"`
		IPAddress    string    `json:"ip_address"`
		ErrorMessage string    `json:"error_message"`
		Module       string    `json:"module"`
		FunctionName string    `json:"function_name"`
	}
	var logs []LogRow
	for rows.Next() {
		var r LogRow
		if err := rows.Scan(&r.ID, &r.CreatedAt, &r.Level,
			&r.Category, &r.Method, &r.Path, &r.StatusCode,
			&r.DurationMs, &r.UserID, &r.IPAddress,
			&r.ErrorMessage, &r.Module, &r.FunctionName); err != nil {
			continue
		}
		logs = append(logs, r)
	}
	if logs == nil {
		logs = []LogRow{}
	}
	c.JSON(200, gin.H{"logs": logs, "count": len(logs)})
}

func (h *SystemHandler) GetLogsSummary(c *gin.Context) {
	var summary struct {
		ErrorCount   int      `json:"errors"`
		WarnCount    int      `json:"warns"`
		InfoCount    int      `json:"infos"`
		Total        int      `json:"total"`
		AvgLatency   float64  `json:"avg_latency"`
		ErrorRatePct float64  `json:"error_rate_pct"`
		TopErrors    []string `json:"top_errors"`
	}

	// Basic counts for last 24h
	err := h.Pool.QueryRow(c.Request.Context(), `
		SELECT 
			COUNT(*) FILTER (WHERE level = 'ERROR'),
			COUNT(*) FILTER (WHERE level = 'WARN'),
			COUNT(*) FILTER (WHERE level = 'INFO'),
			COUNT(*),
			COALESCE(AVG(duration_ms), 0)
		FROM system_logs
		WHERE created_at >= NOW() - INTERVAL '24 hours'
	`).Scan(&summary.ErrorCount, &summary.WarnCount, &summary.InfoCount, &summary.Total, &summary.AvgLatency)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if summary.Total > 0 {
		summary.ErrorRatePct = (float64(summary.ErrorCount) / float64(summary.Total)) * 100
	}

	// Top 5 error paths
	rows, err := h.Pool.Query(c.Request.Context(), `
		SELECT path FROM system_logs
		WHERE level = 'ERROR' AND created_at >= NOW() - INTERVAL '24 hours'
		GROUP BY path ORDER BY COUNT(*) DESC LIMIT 5
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p string
			if err := rows.Scan(&p); err == nil {
				summary.TopErrors = append(summary.TopErrors, p)
			}
		}
	}
	if summary.TopErrors == nil {
		summary.TopErrors = []string{}
	}

	c.JSON(200, gin.H{"summary": summary})
}
