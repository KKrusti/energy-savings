package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/carlos/energy-savings/internal/api"
	"github.com/carlos/energy-savings/internal/domain"
	"github.com/carlos/energy-savings/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubSimOfferService struct {
	offers []domain.Offer
}

func (s *stubSimOfferService) ListOffers(_ context.Context) ([]domain.Offer, error) {
	return s.offers, nil
}
func (s *stubSimOfferService) GetOffer(_ context.Context, id int64) (domain.Offer, error) {
	for _, o := range s.offers {
		if o.ID == id {
			return o, nil
		}
	}
	return domain.Offer{}, service.ErrOfferNotFound
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
