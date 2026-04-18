package logger

import (
    "context"
    "fmt"
    "io"
    "runtime"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

type Logger struct {
    Pool *pgxpool.Pool
}

type LogEntry struct {
    Level        string
    Category     string
    Method       string
    Path         string
    StatusCode   int
    DurationMs   int
    UserID       string
    TenantID     int
    IPAddress    string
    RequestBody  string
    ResponseBody string
    ErrorMessage string
    StackTrace   string
    Module       string
    FunctionName string
    Metadata     map[string]interface{}
}

var Global *Logger

func Init(pool *pgxpool.Pool) {
    Global = &Logger{Pool: pool}
}

func (l *Logger) Write(entry LogEntry) {
    // Always print to stdout first (never fails)
    fmt.Printf("[%s] %s %s %s %d %dms user=%s err=%s\n",
        entry.Level,
        time.Now().Format("2006-01-02 15:04:05"),
        entry.Method,
        entry.Path,
        entry.StatusCode,
        entry.DurationMs,
        entry.UserID,
        entry.ErrorMessage,
    )

    // Write to DB asynchronously so it never slows down the request
    if l.Pool == nil {
        return
    }
    go func() {
        ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
        defer cancel()

        // Truncate long fields
        reqBody := entry.RequestBody
        if len(reqBody) > 2000 {
            reqBody = reqBody[:2000] + "...[truncated]"
        }
        respBody := entry.ResponseBody
        if len(respBody) > 2000 {
            respBody = respBody[:2000] + "...[truncated]"
        }
        errMsg := entry.ErrorMessage
        if len(errMsg) > 1000 {
            errMsg = errMsg[:1000]
        }

        _, err := l.Pool.Exec(ctx, `
            INSERT INTO system_logs
              (level, category, method, path, status_code, duration_ms,
               user_id, ip_address, request_body, response_body,
               error_message, stack_trace, module, function_name)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            entry.Level, entry.Category, entry.Method, entry.Path,
            entry.StatusCode, entry.DurationMs,
            entry.UserID, entry.IPAddress,
            reqBody, respBody, errMsg, entry.StackTrace,
            entry.Module, entry.FunctionName,
        )
        if err != nil {
            fmt.Printf("[LOGGER-ERROR] failed to write log: %v\n", err)
        }
    }()
}

// LogError is the main helper — call this in any handler when something fails
func LogError(category, module, functionName, errMsg string) {
    if Global == nil {
        fmt.Printf("[ERROR] %s/%s: %s\n", module, functionName, errMsg)
        return
    }
    // Capture caller info
    _, file, line, _ := runtime.Caller(1)
    stack := fmt.Sprintf("%s:%d", file, line)

    Global.Write(LogEntry{
        Level:        "ERROR",
        Category:     category,
        Module:       module,
        FunctionName: functionName,
        ErrorMessage: errMsg,
        StackTrace:   stack,
    })
}

// LogInfo for successful important operations
func LogInfo(module, functionName, message string) {
    if Global == nil {
        fmt.Printf("[INFO] %s/%s: %s\n", module, functionName, message)
        return
    }
    Global.Write(LogEntry{
        Level:        "INFO",
        Category:     "BUSINESS",
        Module:       module,
        FunctionName: functionName,
        ErrorMessage: message,
    })
}

// Middleware auto-logs every HTTP request
func Middleware(l *Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()

        // Capture request body for POST/PUT/PATCH
        var reqBody string
        if c.Request.Method == "POST" || c.Request.Method == "PUT" ||
            c.Request.Method == "PATCH" {
            buf := make([]byte, 4096)
            n, _ := c.Request.Body.Read(buf)
            reqBody = string(buf[:n])
            // Restore body so handler can still read it
            c.Request.Body = io.NopCloser(strings.NewReader(reqBody))
        }

        // Use response writer wrapper to capture status code
        blw := &bodyLogWriter{body: &strings.Builder{}, ResponseWriter: c.Writer}
        c.Writer = blw

        c.Next()

        duration := time.Since(start)
        status := c.Writer.Status()

        level := "INFO"
        if status >= 500 {
            level = "ERROR"
        } else if status >= 400 {
            level = "WARN"
        }

        userID := ""
        if uid, exists := c.Get("username"); exists {
            userID = fmt.Sprintf("%v", uid)
        }

        // Only capture response body on errors (saves space)
        respBody := ""
        if status >= 400 {
            respBody = blw.body.String()
        }

        // Detect module from path
        module := detectModule(c.FullPath())

        l.Write(LogEntry{
            Level:        level,
            Category:     "API",
            Method:       c.Request.Method,
            Path:         c.FullPath(),
            StatusCode:   status,
            DurationMs:   int(duration.Milliseconds()),
            UserID:       userID,
            IPAddress:    c.ClientIP(),
            RequestBody:  reqBody,
            ResponseBody: respBody,
            Module:       module,
            FunctionName: c.HandlerName(),
        })
    }
}

func detectModule(path string) string {
    switch {
    case strings.Contains(path, "/po/"):
        return "PO"
    case strings.Contains(path, "/rfq"):
        return "RFQ"
    case strings.Contains(path, "/purchase"):
        return "PURCHASING"
    case strings.Contains(path, "/org/"):
        return "ORG"
    case strings.Contains(path, "/auth"):
        return "AUTH"
    case strings.Contains(path, "/materials"):
        return "MATERIAL"
    case strings.Contains(path, "/suppliers"):
        return "SUPPLIER"
    default:
        return "SYSTEM"
    }
}

type bodyLogWriter struct {
    gin.ResponseWriter
    body *strings.Builder
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
    w.body.Write(b)
    return w.ResponseWriter.Write(b)
}
