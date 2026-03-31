// Package service contains the business logic layer.
package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/carlos/energy-savings/internal/domain"
	"github.com/carlos/energy-savings/internal/repository"
)

// ErrOfferNotFound is returned when an offer does not exist.
var ErrOfferNotFound = errors.New("offer not found")

// ErrInvalidInput is returned when the input fails validation.
var ErrInvalidInput = errors.New("invalid input")

// offerRepo is the interface the service depends on (enables test mocking).
type offerRepo interface {
	Create(ctx context.Context, input domain.CreateOfferInput) (domain.Offer, error)
	GetByID(ctx context.Context, id int64) (domain.Offer, error)
	List(ctx context.Context) ([]domain.Offer, error)
	Update(ctx context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error)
	Delete(ctx context.Context, id int64) error
}

// OfferService orchestrates offer operations.
type OfferService struct {
	repo offerRepo
}

// NewOfferService creates a new OfferService.
func NewOfferService(repo offerRepo) *OfferService {
	return &OfferService{repo: repo}
}

// CreateOffer validates and creates a new offer.
func (s *OfferService) CreateOffer(ctx context.Context, input domain.CreateOfferInput) (domain.Offer, error) {
	if err := validateCreateInput(input); err != nil {
		return domain.Offer{}, fmt.Errorf("%w: %s", ErrInvalidInput, err)
	}
	return s.repo.Create(ctx, input)
}

// GetOffer retrieves a single offer by ID.
func (s *OfferService) GetOffer(ctx context.Context, id int64) (domain.Offer, error) {
	offer, err := s.repo.GetByID(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return domain.Offer{}, ErrOfferNotFound
	}
	return offer, err
}

// ListOffers returns all offers.
func (s *OfferService) ListOffers(ctx context.Context) ([]domain.Offer, error) {
	return s.repo.List(ctx)
}

// UpdateOffer validates and updates an existing offer.
func (s *OfferService) UpdateOffer(ctx context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error) {
	if err := validateUpdateInput(input); err != nil {
		return domain.Offer{}, fmt.Errorf("%w: %s", ErrInvalidInput, err)
	}
	offer, err := s.repo.Update(ctx, id, input)
	if errors.Is(err, repository.ErrNotFound) {
		return domain.Offer{}, ErrOfferNotFound
	}
	return offer, err
}

// DeleteOffer removes an offer by ID.
func (s *OfferService) DeleteOffer(ctx context.Context, id int64) error {
	err := s.repo.Delete(ctx, id)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrOfferNotFound
	}
	return err
}

func validateCreateInput(input domain.CreateOfferInput) error {
	if input.Name == "" {
		return errors.New("name is required")
	}
	if input.Provider == "" {
		return errors.New("provider is required")
	}
	if input.EnergyPricePeakKWh < 0 || input.EnergyPriceMidKWh < 0 || input.EnergyPriceValleyKWh < 0 {
		return errors.New("energy prices must be non-negative")
	}
	if input.PowerTermPricePeak < 0 || input.PowerTermPriceValley < 0 {
		return errors.New("power term prices must be non-negative")
	}
	if input.SurplusCompensation < 0 {
		return errors.New("surplus_compensation must be non-negative")
	}
	if input.HasPermanence && input.PermanenceMonths <= 0 {
		return errors.New("permanence_months must be greater than 0 when has_permanence is true")
	}
	return nil
}

func validateUpdateInput(input domain.UpdateOfferInput) error {
	if input.Name == "" {
		return errors.New("name is required")
	}
	if input.Provider == "" {
		return errors.New("provider is required")
	}
	if input.EnergyPricePeakKWh < 0 || input.EnergyPriceMidKWh < 0 || input.EnergyPriceValleyKWh < 0 {
		return errors.New("energy prices must be non-negative")
	}
	if input.PowerTermPricePeak < 0 || input.PowerTermPriceValley < 0 {
		return errors.New("power term prices must be non-negative")
	}
	if input.SurplusCompensation < 0 {
		return errors.New("surplus_compensation must be non-negative")
	}
	if input.HasPermanence && input.PermanenceMonths <= 0 {
		return errors.New("permanence_months must be greater than 0 when has_permanence is true")
	}
	return nil
}
