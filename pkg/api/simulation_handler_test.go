package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/carlos/energy-savings/pkg/api"
	"github.com/carlos/energy-savings/pkg/domain"
	"github.com/carlos/energy-savings/pkg/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubSimOfferService struct {
	offers []domain.Offer
}

func (s *stubSimOfferService) ListOffers(_ context.Context, _ int64) ([]domain.Offer, error) {
	return s.offers, nil
}
func (s *stubSimOfferService) GetOffer(_ context.Context, id int64, _ int64) (domain.Offer, error) {
	for _, o := range s.offers {
		if o.ID == id {
			return o, nil
		}
	}
	return domain.Offer{}, service.ErrOfferNotFound
}

func buildMonths(n int) []domain.MonthlyConsumption {
	months := make([]domain.MonthlyConsumption, n)
	for i := range months {
		months[i] = domain.MonthlyConsumption{
			Month:   i + 1,
			Year:    2025,
			PeakKWh: 100, MidKWh: 100, ValleyKWh: 100,
			PowerPeakKW:   3.45,
			PowerValleyKW: 3.45,
			SurplusKWh:    0,
		}
	}
	return months
}

func TestSimulationHandler_Simulate(t *testing.T) {
	calc := service.NewCalculatorService()
	offers := []domain.Offer{
		{ID: 1, Name: "Offer A", Provider: "X", EnergyPriceFlat: true, EnergyPricePeakKWh: 0.15, PowerTermSamePrice: true, PowerTermPricePeak: 38.04},
		{ID: 2, Name: "Offer B", Provider: "Y", EnergyPriceFlat: true, EnergyPricePeakKWh: 0.12, PowerTermSamePrice: true, PowerTermPricePeak: 40.0},
	}
	offerSvc := &stubSimOfferService{offers: offers}

	tests := []struct {
		name       string
		body       any
		wantStatus int
		wantLen    int
	}{
		{
			name: "simular todas las ofertas",
			body: domain.SimulationRequest{
				ConsumptionKWh: 300, ContractedPowerKW: 3.45,
				DaysInPeriod: 30,
			},
			wantStatus: http.StatusOK,
			wantLen:    2,
		},
		{
			name: "simular oferta específica",
			body: domain.SimulationRequest{
				OfferID: 1, ConsumptionKWh: 300, ContractedPowerKW: 3.45,
				DaysInPeriod: 30,
			},
			wantStatus: http.StatusOK,
			wantLen:    1,
		},
		{
			name:       "días inválidos",
			body:       domain.SimulationRequest{ConsumptionKWh: 300, DaysInPeriod: 0},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "consumo negativo",
			body:       domain.SimulationRequest{ConsumptionKWh: -10, DaysInPeriod: 30},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := api.NewSimulationHandler(offerSvc, calc)
			body, _ := json.Marshal(tc.body)
			req := httptest.NewRequest(http.MethodPost, "/api/simulate", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			h.Simulate(w, req)

			assert.Equal(t, tc.wantStatus, w.Code)
			if tc.wantLen > 0 {
				var resp domain.SimulationResponse
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				assert.Len(t, resp.Breakdowns, tc.wantLen)
			}
		})
	}
}

func TestSimulationHandler_SimulateAnnual(t *testing.T) {
	calc := service.NewCalculatorService()
	offers := []domain.Offer{
		{ID: 1, Name: "Offer A", Provider: "X", EnergyPriceFlat: true, EnergyPricePeakKWh: 0.15, PowerTermSamePrice: true, PowerTermPricePeak: 38.04},
		{ID: 2, Name: "Offer B", Provider: "Y", EnergyPriceFlat: true, EnergyPricePeakKWh: 0.12, PowerTermSamePrice: true, PowerTermPricePeak: 40.0},
	}
	offerSvc := &stubSimOfferService{offers: offers}

	tests := []struct {
		name       string
		body       any
		wantStatus int
		wantOffers int
		wantMonths int
	}{
		{
			name:       "valid 12-month request",
			body:       domain.AnnualSimulationRequest{Months: buildMonths(12)},
			wantStatus: http.StatusOK,
			wantOffers: 2,
			wantMonths: 12,
		},
		{
			name:       "valid partial year (3 months)",
			body:       domain.AnnualSimulationRequest{Months: buildMonths(3)},
			wantStatus: http.StatusOK,
			wantOffers: 2,
			wantMonths: 3,
		},
		{
			name:       "empty months",
			body:       domain.AnnualSimulationRequest{Months: []domain.MonthlyConsumption{}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "more than 12 months rejected",
			body:       domain.AnnualSimulationRequest{Months: buildMonths(13)},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "invalid month value",
			body: domain.AnnualSimulationRequest{Months: []domain.MonthlyConsumption{
				{Month: 13, Year: 2025, PeakKWh: 100, MidKWh: 100, ValleyKWh: 100, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "surplus_kwh < 0 rejected",
			body: domain.AnnualSimulationRequest{Months: []domain.MonthlyConsumption{
				{Month: 1, Year: 2025, PeakKWh: 100, MidKWh: 100, ValleyKWh: 100, PowerPeakKW: 3.45, PowerValleyKW: 3.45, SurplusKWh: -1},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "negative consumption rejected",
			body: domain.AnnualSimulationRequest{Months: []domain.MonthlyConsumption{
				{Month: 1, Year: 2025, PeakKWh: -10, MidKWh: 100, ValleyKWh: 100, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "power_peak_kw <= 0 rejected",
			body: domain.AnnualSimulationRequest{Months: []domain.MonthlyConsumption{
				{Month: 1, Year: 2025, PeakKWh: 100, MidKWh: 100, ValleyKWh: 100, PowerPeakKW: 0, PowerValleyKW: 3.45},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "power_valley_kw <= 0 rejected",
			body: domain.AnnualSimulationRequest{Months: []domain.MonthlyConsumption{
				{Month: 1, Year: 2025, PeakKWh: 100, MidKWh: 100, ValleyKWh: 100, PowerPeakKW: 3.45, PowerValleyKW: 0},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "bad JSON body",
			body:       "not-json",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := api.NewSimulationHandler(offerSvc, calc)
			body, _ := json.Marshal(tc.body)
			req := httptest.NewRequest(http.MethodPost, "/api/simulate/annual", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			h.SimulateAnnual(w, req)

			assert.Equal(t, tc.wantStatus, w.Code)
			if tc.wantOffers > 0 {
				var resp domain.AnnualSimulationResponse
				require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
				assert.Len(t, resp.Offers, tc.wantOffers)
				for _, o := range resp.Offers {
					assert.Len(t, o.Months, tc.wantMonths)
				}
			}
		})
	}
}
