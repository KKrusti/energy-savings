// Package api wires up HTTP handlers and middleware.
package api

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter creates and returns the main application router.
// allowedOrigins is a comma-separated list of origins permitted by CORS
// (e.g. "http://localhost:5173,https://app.example.com").
func NewRouter(offerH *OfferHandler, simH *SimulationHandler, allowedOrigins string) http.Handler {
	origins := parseOrigins(allowedOrigins)

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Route("/offers", func(r chi.Router) {
			r.Get("/", offerH.List)
			r.Post("/", offerH.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", offerH.Get)
				r.Put("/", offerH.Update)
				r.Delete("/", offerH.Delete)
			})
		})
		r.Post("/simulate", simH.Simulate)
	})

	return r
}

// parseOrigins splits a comma-separated origins string into a slice,
// trimming whitespace. Falls back to localhost dev defaults when empty.
func parseOrigins(s string) []string {
	if s == "" {
		return []string{"http://localhost:5173", "http://localhost:3000"}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if o := strings.TrimSpace(p); o != "" {
			out = append(out, o)
		}
	}
	return out
}
