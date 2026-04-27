// Package api wires up HTTP handlers and middleware.
package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
)

// NewRouter creates and returns the main application router.
func NewRouter(
	offerH *OfferHandler,
	simH *SimulationHandler,
	consumptionH *ConsumptionHandler,
	authH *AuthHandler,
	userRepo tokenChecker,
	allowedOrigins string,
) http.Handler {
	origins := parseOrigins(allowedOrigins)

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(securityHeaders)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		// Public auth routes — strict rate limit per IP: 10 requests/minute
		r.Route("/auth", func(r chi.Router) {
			r.Use(httprate.LimitByIP(10, time.Minute))
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)
			r.Post("/logout", authH.Logout)
		})

		// Protected routes — require valid JWT; general rate limit prevents abuse
		r.Group(func(r chi.Router) {
			r.Use(httprate.LimitByIP(200, time.Minute))
			r.Use(RequireAuth(userRepo))

			r.Post("/auth/password", authH.ChangePassword)

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
			r.Post("/simulate/annual", simH.SimulateAnnual)

			r.Route("/consumption", func(r chi.Router) {
				r.Get("/history", consumptionH.GetHistory)
				r.Put("/history", consumptionH.SaveHistory)
			})
		})
	})

	return r
}

// securityHeaders sets standard defensive HTTP headers on every response.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		next.ServeHTTP(w, r)
	})
}

// parseOrigins splits a comma-separated origins string into a slice,
// trimming whitespace. Returns an empty slice when the string is empty,
// which effectively disables cross-origin requests.
func parseOrigins(s string) []string {
	if s == "" {
		return []string{}
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
