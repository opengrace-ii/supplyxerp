package handlers

import (
	"net/http"

	"erplite/backend/internal/events"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, refine this to allowed origins
	},
}

type WebSocketHandler struct {
	Hub *events.Hub
}

func NewWebSocketHandler(hub *events.Hub) *WebSocketHandler {
	return &WebSocketHandler{Hub: hub}
}

func (h *WebSocketHandler) Handle(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &events.Client{
		ID:   uuid.NewString(), 
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	h.Hub.Register <- client

	// Start pumps
	go client.WritePump()
	go client.ReadPump(h.Hub)
}
