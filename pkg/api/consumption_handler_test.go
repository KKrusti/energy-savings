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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// stubConsumptionStore is an in-memory stub implementing consumptionStore.
type stubConsumptionStore struct {
	data []domain.MonthlyConsumption
	err  error
}

func (s *stubConsumptionStore) Upsert(_ context.Context, _ int64, months []domain.MonthlyConsumption) error {
	if s.err != nil {
		return s.err
	}
	s.data = months
	return nil
}

func (s *stubConsumptionStore) List(_ context.Context, _ int64) ([]domain.MonthlyConsumption, error) {
	return s.data, s.err
}

func validHistoryBody() domain.ConsumptionHistoryResponse {
	return domain.ConsumptionHistoryResponse{
		Months: []domain.MonthlyConsumption{
			{Month: 1, Year: 2026, PeakKWh: 100, MidKWh: 80, ValleyKWh: 60, PowerPeakKW: 3.45, PowerValleyKW: 3.45, SurplusKWh: 5},
			{Month: 2, Year: 2026, PeakKWh: 90, MidKWh: 70, ValleyKWh: 50, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
		},
	}
}

func TestConsumptionHandler_GetHistory(t *testing.T) {
	tests := []struct {
		name       string
		stored     []domain.MonthlyConsumption
		wantStatus int
		wantLen    int
	}{
		{
			name:       "returns empty list when no data",
			stored:     nil,
			wantStatus: http.StatusOK,
			wantLen:    0,
		},
		{
			name: "returns stored months",
			stored: []domain.MonthlyConsumption{
				{Month: 1, Year: 2026, PeakKWh: 100, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
				{Month: 2, Year: 2026, PeakKWh: 90, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
			},
			wantStatus: http.StatusOK,
			wantLen:    2,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h := api.NewConsumptionHandler(&stubConsumptionStore{data: tc.stored})
			req := httptest.NewRequest(http.MethodGet, "/api/consumption/history", nil)
			w := httptest.NewRecorder()
			h.GetHistory(w, req)

			assert.Equal(t, tc.wantStatus, w.Code)
			var resp domain.ConsumptionHistoryResponse
			require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
			assert.Len(t, resp.Months, tc.wantLen)
		})
	}
}

func TestConsumptionHandler_SaveHistory(t *testing.T) {
	tests := []struct {
		name       string
		body       any
		wantStatus int
	}{
		{
			name:       "valid months saved",
			body:       validHistoryBody(),
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "bad json",
			body:       "not-json",
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "invalid month value",
			body: domain.ConsumptionHistoryResponse{Months: []domain.MonthlyConsumption{
				{Month: 13, Year: 2026, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "invalid year",
			body: domain.ConsumptionHistoryResponse{Months: []domain.MonthlyConsumption{
				{Month: 1, Year: 1999, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "negative consumption",
			body: domain.ConsumptionHistoryResponse{Months: []domain.MonthlyConsumption{
				{Month: 1, Year: 2026, PeakKWh: -1, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "power_peak_kw <= 0",
			body: domain.ConsumptionHistoryResponse{Months: []domain.MonthlyConsumption{
				{Month: 1, Year: 2026, PowerPeakKW: 0, PowerValleyKW: 3.45},
			}},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := &stubConsumptionStore{}
			h := api.NewConsumptionHandler(store)
			body, _ := json.Marshal(tc.body)
			req := httptest.NewRequest(http.MethodPut, "/api/consumption/history", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			h.SaveHistory(w, req)

			assert.Equal(t, tc.wantStatus, w.Code)
		})
	}
}
