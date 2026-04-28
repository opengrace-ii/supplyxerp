package handlers

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "net/smtp"
    "os"
    "strings"
    "time"

    "github.com/jackc/pgx/v5/pgtype"
    "supplyxerp/backend/internal/db/dbgen"
)

// DispatchContext — variables available for template rendering
type DispatchContext map[string]string

// TriggerDispatch — called from any handler after a business event.
// Finds all active rules for the event, renders templates, sends.
// Always non-blocking — errors are logged, never returned to caller.
func TriggerDispatch(
    ctx context.Context,
    queries   *dbgen.Queries,
    tenantID  int64,
    event     string,
    refType   string,
    refID     int64,
    refCode   string,
    tplVars   DispatchContext,
) {
    rules, err := queries.GetDispatchRulesByEvent(ctx,
        dbgen.GetDispatchRulesByEventParams{
            TenantID:     tenantID,
            TriggerEvent: event,
        })
    if err != nil || len(rules) == 0 {
        return  // no rules — nothing to do
    }

    // copy map safely if we want to run in goroutines
    varsCopy := make(DispatchContext, len(tplVars))
    for k, v := range tplVars {
        varsCopy[k] = v
    }

    for _, rule := range rules {
        // Run in background without cancelling when the HTTP request finishes
        go dispatchOne(context.Background(), queries, tenantID, rule, refType, refID, refCode, varsCopy)
    }
}

func dispatchOne(
    ctx      context.Context,
    queries  *dbgen.Queries,
    tenantID int64,
    rule     dbgen.DispatchRule,
    refType  string,
    refID    int64,
    refCode  string,
    vars     DispatchContext,
) {
    subject := renderTemplate(rule.SubjectTemplate.String, vars)
    body    := renderTemplate(rule.BodyTemplate.String, vars)

    status := "SENT"
    errMsg := ""
    var sentAt *time.Time

    switch rule.Channel {
    case "EMAIL":
        if err := sendEmail(rule.RecipientValue, subject, body); err != nil {
            status = "FAILED"
            errMsg = err.Error()
        } else {
            now := time.Now()
            sentAt = &now
        }

    case "WEBHOOK":
        if err := sendWebhook(rule.RecipientValue, map[string]interface{}{
            "event":          rule.TriggerEvent,
            "reference_type": refType,
            "reference_id":   refID,
            "reference_code": refCode,
            "timestamp":      time.Now().UTC().Format(time.RFC3339),
            "data":           vars,
        }); err != nil {
            status = "FAILED"
            errMsg = err.Error()
        } else {
            now := time.Now()
            sentAt = &now
        }

    case "IN_APP":
        // In-app: just log it — the frontend polls dispatch_logs
        now := time.Now()
        sentAt = &now
    }

    var sentAtVal pgtype.Timestamptz
    if sentAt != nil {
        sentAtVal = pgtype.Timestamptz{Time: *sentAt, Valid: true}
    } else {
        sentAtVal = pgtype.Timestamptz{Valid: false}
    }

    _, _ = queries.LogDispatch(ctx, dbgen.LogDispatchParams{
        TenantID:       tenantID,
        DispatchRuleID: pgtype.Int8{Int64: rule.ID, Valid: true},
        TriggerEvent:   rule.TriggerEvent,
        ReferenceType:  pgtype.Text{String: refType, Valid: true},
        ReferenceID:    pgtype.Int8{Int64: refID, Valid: true},
        ReferenceCode:  pgtype.Text{String: refCode, Valid: true},
        Channel:        rule.Channel,
        Recipient:      rule.RecipientValue,
        Subject:        pgtype.Text{String: subject, Valid: true},
        Status:         status,
        ErrorMessage:   pgtype.Text{String: errMsg, Valid: errMsg != ""},
        SentAt:         sentAtVal,
    })
}

// renderTemplate replaces {{key}} with values from vars map
func renderTemplate(template string, vars DispatchContext) string {
    result := template
    for k, v := range vars {
        result = strings.ReplaceAll(result, "{{"+k+"}}", v)
    }
    return result
}

// sendEmail — uses SMTP config from environment
// In development: logs to stdout instead of sending
func sendEmail(to, subject, body string) error {
    // Read SMTP config from environment (set in docker-compose.yml)
    // SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
    smtpHost := getEnv("SMTP_HOST", "")
    if smtpHost == "" {
        // Development mode: log instead of send
        fmt.Printf("[DISPATCH-EMAIL] To: %s\nSubject: %s\nBody: %s\n---\n",
            to, subject, body)
        return nil
    }

    smtpPort := getEnv("SMTP_PORT", "587")
    smtpUser := getEnv("SMTP_USER", "")
    smtpPass := getEnv("SMTP_PASS", "")
    smtpFrom := getEnv("SMTP_FROM", smtpUser)

    auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
    msg  := fmt.Sprintf(
        "From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-version: 1.0\r\n"+
        "Content-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s",
        smtpFrom, to, subject, body,
    )

    return smtp.SendMail(
        smtpHost+":"+smtpPort,
        auth,
        smtpFrom,
        []string{to},
        []byte(msg),
    )
}

// sendWebhook — HTTP POST to the configured URL
func sendWebhook(url string, payload map[string]interface{}) error {
    data, err := json.Marshal(payload)
    if err != nil {
        return err
    }

    client  := &http.Client{Timeout: 10 * time.Second}
    req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
    if err != nil {
        return err
    }
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-SupplyXERP-Event", payload["event"].(string))

    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("webhook returned HTTP %d", resp.StatusCode)
    }
    return nil
}

func getEnv(key, fallback string) string {
    val := os.Getenv(key)
    if val == "" { return fallback }
    return val
}
