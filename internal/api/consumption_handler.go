package api

import (
	"context"
	"net/http"

	"github.com/carlos/energy-savings/internal/domain"
)

// consumptionStore is the persistence interface for consumption history.
type consumptionStore interface {
	Upsert(ctx context.Context, months []domain.MonthlyConsumption) error
	List(ctx context.Context) ([]domain.MonthlyConsumption, error)
}

// ConsumptionHandler handles HTTP requests for historical consumption data.
type ConsumptionHandler struct {
	store consumptionStore
}

// NewConsumptionHandler creates a new ConsumptionHandler.
func NewConsumptionHandler(store consumptionStore) *ConsumptionHandler {
	return &ConsumptionHandler{store: store}
}

// GetHistory godoc — GET /api/consumption/history
// Returns all saved monthly consumption entries ordered chronologically.
func (h *ConsumptionHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	months, err := h.store.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al obtener historial")
		return
	}
	if months == nil {
		months = []domain.MonthlyConsumption{}
	}
	writeJSON(w, http.StatusOK, domain.ConsumptionHistoryResponse{Months: months})
}

// SaveHistory godoc — PUT /api/consumption/history
// Upserts all months in the request body (insert or replace by month+year).
func (h *ConsumptionHandler) SaveHistory(w http.ResponseWriter, r *http.Request) {
	var req domain.SaveHistoryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}

	for _, m := range req.Months {
		if status, msg := validateMonthlyConsumption(m, true); status != 0 {
			writeError(w, status, msg)
			return
		}
	}

	if err := h.store.Upsert(r.Context(), req.Months); err != nil {
		writeError(w, http.StatusInternalServerError, "error al guardar historial")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
