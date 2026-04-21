package api

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/carlos/energy-savings/pkg/domain"
	"github.com/carlos/energy-savings/pkg/service"
)

// simulationService is the interface SimulationHandler depends on.
type simulationService interface {
	ListOffers(ctx context.Context, userID int64) ([]domain.Offer, error)
	GetOffer(ctx context.Context, id int64, userID int64) (domain.Offer, error)
}

// calculator is the interface for bill computation.
type calculator interface {
	Calculate(offer domain.Offer, req domain.SimulationRequest) domain.BillBreakdown
	CalculateAll(offers []domain.Offer, req domain.SimulationRequest) domain.SimulationResponse
	CalculateAnnual(offers []domain.Offer, req domain.AnnualSimulationRequest) domain.AnnualSimulationResponse
}

// SimulationHandler handles HTTP requests for bill simulations.
type SimulationHandler struct {
	offerSvc simulationService
	calc     calculator
}

// NewSimulationHandler creates a new SimulationHandler.
func NewSimulationHandler(offerSvc simulationService, calc calculator) *SimulationHandler {
	return &SimulationHandler{offerSvc: offerSvc, calc: calc}
}

// Simulate godoc - POST /api/simulate
func (h *SimulationHandler) Simulate(w http.ResponseWriter, r *http.Request) {
	var req domain.SimulationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}

	if req.ConsumptionKWh < 0 {
		writeError(w, http.StatusUnprocessableEntity, "consumption_kwh no puede ser negativo")
		return
	}
	if req.DaysInPeriod <= 0 {
		writeError(w, http.StatusUnprocessableEntity, "days_in_period debe ser mayor que 0")
		return
	}

	ctx := r.Context()
	userID := UserIDFromContext(ctx)

	if req.OfferID != 0 {
		offer, err := h.offerSvc.GetOffer(ctx, req.OfferID, userID)
		if errors.Is(err, service.ErrOfferNotFound) {
			writeError(w, http.StatusNotFound, "oferta no encontrada")
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "error al obtener oferta")
			return
		}
		breakdown := h.calc.Calculate(offer, req)
		writeJSON(w, http.StatusOK, domain.SimulationResponse{Breakdowns: []domain.BillBreakdown{breakdown}})
		return
	}

	offers, err := h.offerSvc.ListOffers(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al obtener ofertas")
		return
	}
	if len(offers) == 0 {
		writeJSON(w, http.StatusOK, domain.SimulationResponse{Breakdowns: []domain.BillBreakdown{}})
		return
	}

	resp := h.calc.CalculateAll(offers, req)
	writeJSON(w, http.StatusOK, resp)
}

// SimulateAnnual godoc - POST /api/simulate/annual
func (h *SimulationHandler) SimulateAnnual(w http.ResponseWriter, r *http.Request) {
	var req domain.AnnualSimulationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}

	if len(req.Months) == 0 {
		writeError(w, http.StatusUnprocessableEntity, "months no puede estar vacío")
		return
	}
	if len(req.Months) > 12 {
		writeError(w, http.StatusUnprocessableEntity, "months no puede tener más de 12 entradas")
		return
	}

	currentYear := time.Now().Year()

	for i, m := range req.Months {
		if status, msg := validateMonthlyConsumption(m, false); status != 0 {
			writeError(w, status, msg)
			return
		}
		year := m.Year
		if year == 0 {
			year = currentYear
		}
		req.Months[i].Days = time.Date(year, time.Month(m.Month+1), 0, 0, 0, 0, 0, time.UTC).Day()
	}

	ctx := r.Context()
	userID := UserIDFromContext(ctx)

	offers, err := h.offerSvc.ListOffers(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al obtener ofertas")
		return
	}
	if len(offers) == 0 {
		writeJSON(w, http.StatusOK, domain.AnnualSimulationResponse{Offers: []domain.AnnualOfferResult{}})
		return
	}

	resp := h.calc.CalculateAnnual(offers, req)
	writeJSON(w, http.StatusOK, resp)
}
