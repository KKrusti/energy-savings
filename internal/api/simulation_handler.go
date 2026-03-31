package api

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/carlos/energy-savings/internal/domain"
	"github.com/carlos/energy-savings/internal/service"
)

// simulationService is the interface SimulationHandler depends on.
type simulationService interface {
	ListOffers(ctx context.Context) ([]domain.Offer, error)
	GetOffer(ctx context.Context, id int64) (domain.Offer, error)
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
// If offer_id == 0 it simulates all registered offers.
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

	if req.OfferID != 0 {
		offer, err := h.offerSvc.GetOffer(ctx, req.OfferID)
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

	offers, err := h.offerSvc.ListOffers(ctx)
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
// Accepts up to 12 months of tiered consumption data and returns per-offer annual results.
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
	for i, m := range req.Months {
		if m.Month < 1 || m.Month > 12 {
			writeError(w, http.StatusUnprocessableEntity, "month debe estar entre 1 y 12")
			return
		}
		if m.SurplusKWh < 0 {
			writeError(w, http.StatusUnprocessableEntity, "surplus_kwh no puede ser negativo")
			return
		}
		if m.PeakKWh < 0 || m.MidKWh < 0 || m.ValleyKWh < 0 {
			writeError(w, http.StatusUnprocessableEntity, "los valores de consumo no pueden ser negativos")
			return
		}
		if m.PowerPeakKW <= 0 || m.PowerValleyKW <= 0 {
			writeError(w, http.StatusUnprocessableEntity, "power_peak_kw y power_valley_kw deben ser mayores que 0")
			return
		}
		// Derive billing days automatically from the calendar month/year.
		year := m.Year
		if year == 0 {
			year = time.Now().Year()
		}
		req.Months[i].Days = time.Date(year, time.Month(m.Month+1), 0, 0, 0, 0, 0, time.UTC).Day()
	}

	ctx := r.Context()
	offers, err := h.offerSvc.ListOffers(ctx)
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
