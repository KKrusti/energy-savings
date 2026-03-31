// Package api wires up HTTP handlers and middleware.
package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter creates and returns the main application router.
func NewRouter(offerH *OfferHandler, simH *SimulationHandler) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
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
