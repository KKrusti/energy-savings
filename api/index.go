// Package handler is the Vercel serverless entry point.
// Vercel discovers this file and exposes Handler at /api/*.
package handler

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"sync"

	internalapi "github.com/carlos/energy-savings/internal/api"
	"github.com/carlos/energy-savings/internal/database"
	"github.com/carlos/energy-savings/internal/repository"
	"github.com/carlos/energy-savings/internal/service"
)

var (
	once       sync.Once
	appHandler http.Handler
)

// Handler is the single serverless function that routes all /api/* requests
// through the Chi router. Initialized once per warm instance via sync.Once.
func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		connStr := os.Getenv("DATABASE_URL")
		if connStr == "" {
			panic("DATABASE_URL is not set")
		}

		db, err := database.Open(context.Background(), connStr)
		if err != nil {
			panic(fmt.Sprintf("init database: %v", err))
		}

		offerRepo := repository.NewOfferRepository(db)
		consumptionRepo := repository.NewConsumptionRepository(db)
		offerSvc := service.NewOfferService(offerRepo)
		calcSvc := service.NewCalculatorService()

		offerHandler := internalapi.NewOfferHandler(offerSvc)
		simHandler := internalapi.NewSimulationHandler(offerSvc, calcSvc)
		consumptionHandler := internalapi.NewConsumptionHandler(consumptionRepo)

		corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
		appHandler = internalapi.NewRouter(offerHandler, simHandler, consumptionHandler, corsOrigins)
	})

	appHandler.ServeHTTP(w, r)
}
