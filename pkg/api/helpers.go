package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/carlos/energy-savings/pkg/domain"
)

// maxBodyBytes is the maximum size accepted for request bodies (1 MiB).
const maxBodyBytes = 1 << 20

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// decodeJSON decodes the request body into v.
// It enforces a body size limit to prevent DoS via oversized payloads,
// and rejects unknown fields to surface client mistakes early.
func decodeJSON(r *http.Request, v any) error {
	limited := io.LimitReader(r.Body, maxBodyBytes+1)
	dec := json.NewDecoder(limited)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return err
	}
	// Check whether the body was truncated (payload exceeded the limit).
	if n, _ := io.ReadFull(limited, make([]byte, 1)); n > 0 {
		return errors.New("request body too large")
	}
	return nil
}

// validateMonthlyConsumption validates a single MonthlyConsumption entry.
// Shared by SimulationHandler (SimulateAnnual) and ConsumptionHandler (SaveHistory).
// When requireYear is true, the year field must be in the range [2000, 2100].
func validateMonthlyConsumption(m domain.MonthlyConsumption, requireYear bool) (status int, msg string) {
	if m.Month < 1 || m.Month > 12 {
		return http.StatusUnprocessableEntity, "month debe estar entre 1 y 12"
	}
	if requireYear && (m.Year < 2000 || m.Year > 2100) {
		return http.StatusUnprocessableEntity, "year no es válido"
	}
	if m.PeakKWh < 0 || m.MidKWh < 0 || m.ValleyKWh < 0 || m.SurplusKWh < 0 {
		return http.StatusUnprocessableEntity, "los valores de consumo no pueden ser negativos"
	}
	if m.PowerPeakKW <= 0 || m.PowerValleyKW <= 0 {
		return http.StatusUnprocessableEntity, "power_peak_kw y power_valley_kw deben ser mayores que 0"
	}
	return 0, ""
}
