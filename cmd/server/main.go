// Command server starts the energy-savings HTTP server.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/carlos/energy-savings/internal/api"
	"github.com/carlos/energy-savings/internal/database"
	"github.com/carlos/energy-savings/internal/repository"
	"github.com/carlos/energy-savings/internal/service"
)

func main() {
	ctx := context.Background()

	dbPath := envOrDefault("DB_PATH", "energy-savings.db")
	addr := envOrDefault("ADDR", ":8080")

	db, err := database.Open(ctx, dbPath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	offerRepo := repository.NewOfferRepository(db)
	consumptionRepo := repository.NewConsumptionRepository(db)
	offerSvc := service.NewOfferService(offerRepo)
	calcSvc := service.NewCalculatorService()

	offerHandler := api.NewOfferHandler(offerSvc)
	simHandler := api.NewSimulationHandler(offerSvc, calcSvc)
	consumptionHandler := api.NewConsumptionHandler(consumptionRepo)

	allowedOrigins := envOrDefault("CORS_ALLOWED_ORIGINS", "")
	router := api.NewRouter(offerHandler, simHandler, consumptionHandler, allowedOrigins)

	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("servidor escuchando en %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
	log.Println("servidor detenido")
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
