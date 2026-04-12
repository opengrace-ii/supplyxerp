package handlers

import (
	"net/http"

	"erplite/backend/internal/domain"
	"erplite/backend/internal/utils"
	"github.com/gin-gonic/gin"
)

// respondSuccess wraps a successful response in the spec envelope.
func respondSuccess(c *gin.Context, data any, trace *domain.ExecutionTrace) {
	c.JSON(http.StatusOK, domain.ResponseEnvelope{
		Success: true,
		Data:    data,
		Trace:   trace,
		Error:   nil,
	})
}

// respondError wraps an error in the spec envelope.
func respondError(c *gin.Context, err error) {
	if appErr, ok := err.(*utils.AppError); ok {
		c.JSON(appErr.Status, domain.ResponseEnvelope{
			Success: false,
			Data:    nil,
			Trace:   nil,
			Error: &domain.ErrorPayload{
				Code:    appErr.Code,
				Message: appErr.Message,
			},
		})
		return
	}
	c.JSON(http.StatusInternalServerError, domain.ResponseEnvelope{
		Success: false,
		Data:    nil,
		Trace:   nil,
		Error: &domain.ErrorPayload{
			Code:    "INTERNAL_ERROR",
			Message: "internal server error",
		},
	})
}
