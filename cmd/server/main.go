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

	"github.com/carlos/energy-savings/pkg/api"
	"github.com/carlos/energy-savings/pkg/database"
	"github.com/carlos/energy-savings/pkg/repository"
	"github.com/carlos/energy-savings/pkg/service"
)

func main() {
	ctx := context.Background()

	connStr := envOrDefault("DATABASE_URL", "")
	if connStr == "" {
		log.Fatal("DATABASE_URL is required")
	}
	addr := envOrDefault("ADDR", ":8080")

	db, err := database.Open(ctx, connStr)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	offerRepo := repository.NewOfferRepository(db)
	consumptionRepo := repository.NewConsumptionRepository(db)
	userRepo := repository.NewUserRepository(db)

	offerSvc := service.NewOfferService(offerRepo)
	calcSvc := service.NewCalculatorService()

	if err := userRepo.CleanupExpiredTokens(ctx); err != nil {
		log.Printf("cleanup expired tokens: %v", err)
	}

	offerHandler := api.NewOfferHandler(offerSvc)
	simHandler := api.NewSimulationHandler(offerSvc, calcSvc)
	consumptionHandler := api.NewConsumptionHandler(consumptionRepo)
	authHandler := api.NewAuthHandler(userRepo)

	allowedOrigins := envOrDefault("CORS_ALLOWED_ORIGINS", "")
	router := api.NewRouter(offerHandler, simHandler, consumptionHandler, authHandler, userRepo, allowedOrigins)

	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("server listening on %s", addr)
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
	log.Println("server stopped")
}

func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
