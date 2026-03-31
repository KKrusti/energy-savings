package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
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
