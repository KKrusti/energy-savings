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

// stubOfferService for handler tests.
type stubOfferService struct {
	offers map[int64]domain.Offer
	nextID int64
}

func newStubOfferService() *stubOfferService {
	return &stubOfferService{offers: make(map[int64]domain.Offer), nextID: 1}
}

func (s *stubOfferService) CreateOffer(_ context.Context, input domain.CreateOfferInput) (domain.Offer, error) {
	if input.Name == "" {
		return domain.Offer{}, service.ErrInvalidInput
	}
	o := domain.Offer{
		ID: s.nextID, Name: input.Name, Provider: input.Provider,
		EnergyPriceFlat: input.EnergyPriceFlat, EnergyPricePeakKWh: input.EnergyPricePeakKWh,
		PowerTermSamePrice: input.PowerTermSamePrice, PowerTermPricePeak: input.PowerTermPricePeak,
	}
	s.offers[s.nextID] = o
	s.nextID++
	return o, nil
}

func (s *stubOfferService) GetOffer(_ context.Context, id int64) (domain.Offer, error) {
	if o, ok := s.offers[id]; ok {
		return o, nil
	}
	return domain.Offer{}, service.ErrOfferNotFound
}

func (s *stubOfferService) ListOffers(_ context.Context) ([]domain.Offer, error) {
	result := make([]domain.Offer, 0, len(s.offers))
	for _, o := range s.offers {
		result = append(result, o)
	}
	return result, nil
}

func (s *stubOfferService) UpdateOffer(_ context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error) {
	if _, ok := s.offers[id]; !ok {
		return domain.Offer{}, service.ErrOfferNotFound
	}
	o := domain.Offer{ID: id, Name: input.Name, Provider: input.Provider}
	s.offers[id] = o
	return o, nil
}

func (s *stubOfferService) DeleteOffer(_ context.Context, id int64) error {
	if _, ok := s.offers[id]; !ok {
		return service.ErrOfferNotFound
	}
	delete(s.offers, id)
	return nil
}

func TestOfferHandler_List(t *testing.T) {
	stub := newStubOfferService()
	h := api.NewOfferHandler(stub)

	req := httptest.NewRequest(http.MethodGet, "/api/offers", nil)
	w := httptest.NewRecorder()
	h.List(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var offers []domain.Offer
	require.NoError(t, json.NewDecoder(w.Body).Decode(&offers))
	assert.Empty(t, offers)
}

func TestOfferHandler_Create(t *testing.T) {
	tests := []struct {
		name       string
		body       any
		wantStatus int
	}{
		{
			name: "valid offer",
			body: domain.CreateOfferInput{
				Name: "Tarifa T", Provider: "Endesa",
				EnergyPriceFlat: true, EnergyPricePeakKWh: 0.15,
				PowerTermSamePrice: true, PowerTermPricePeak: 38.04,
			},
			wantStatus: http.StatusCreated,
		},
		{
			name:       "body malformado",
			body:       "not json",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing name",
			body:       domain.CreateOfferInput{Provider: "Endesa"},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			stub := newStubOfferService()
			h := api.NewOfferHandler(stub)

			var bodyBytes []byte
			switch v := tc.body.(type) {
			case string:
				bodyBytes = []byte(v)
			default:
				bodyBytes, _ = json.Marshal(v)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/offers", bytes.NewReader(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			h.Create(w, req)

			assert.Equal(t, tc.wantStatus, w.Code)
		})
	}
}
