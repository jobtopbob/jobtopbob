package handlers

import (
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// SSEHandler handles GET /api/v1/events
// Subscribes to Redis Pub/Sub channel sse:{userID} and streams events to the client.
func SSEHandler(rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := getUserID(c)
		channel := fmt.Sprintf("sse:%s", userID)

		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")

		sub := rdb.Subscribe(c.Request.Context(), channel)
		defer sub.Close()

		// Send initial connection event
		c.SSEvent("connected", gin.H{"status": "ok"})
		c.Writer.Flush()

		ch := sub.Channel()
		for {
			select {
			case msg, ok := <-ch:
				if !ok {
					return
				}
				c.SSEvent("message", msg.Payload)
				c.Writer.Flush()
			case <-c.Request.Context().Done():
				slog.Debug("sse client disconnected", "user_id", userID)
				return
			}
		}
	}
}

