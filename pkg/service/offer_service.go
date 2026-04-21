// Package service contains the business logic layer.
package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/carlos/energy-savings/pkg/domain"
	"github.com/carlos/energy-savings/pkg/repository"
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
	// CreateAsCurrent and UpdateAsCurrent perform the unset+write atomically in one transaction,
	// preventing the race condition where a failure between both steps leaves no current offer.
	CreateAsCurrent(ctx context.Context, input domain.CreateOfferInput) (domain.Offer, error)
	UpdateAsCurrent(ctx context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error)
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
// If input.IsCurrent is true, the unset of the previous current offer and the insert are
// performed atomically via CreateAsCurrent to avoid leaving the database in an inconsistent state.
func (s *OfferService) CreateOffer(ctx context.Context, input domain.CreateOfferInput) (domain.Offer, error) {
	if err := validateOfferInput(input.Name, input.Provider, input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh, input.PowerTermPricePeak, input.PowerTermPriceValley, input.SurplusCompensation, input.HasPermanence, input.PermanenceMonths); err != nil {
		return domain.Offer{}, fmt.Errorf("%w: %s", ErrInvalidInput, err)
	}
	if input.IsCurrent {
		return s.repo.CreateAsCurrent(ctx, input)
	}
	return s.repo.Create(ctx, input)
}

// GetOffer retrieves a single offer by ID.
func (s *OfferService) GetOffer(ctx context.Context, id int64) (domain.Offer, error) {
	offer, err := s.repo.GetByID(ctx, id)
	if errors.Is(err, repository.ErrOfferNotFound) {
		return domain.Offer{}, ErrOfferNotFound
	}
	return offer, err
}

// ListOffers returns all offers.
func (s *OfferService) ListOffers(ctx context.Context) ([]domain.Offer, error) {
	return s.repo.List(ctx)
}

// UpdateOffer validates and updates an existing offer.
// If input.IsCurrent is true, the unset of the previous current offer and the update are
// performed atomically via UpdateAsCurrent to avoid leaving the database in an inconsistent state.
func (s *OfferService) UpdateOffer(ctx context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error) {
	if err := validateOfferInput(input.Name, input.Provider, input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh, input.PowerTermPricePeak, input.PowerTermPriceValley, input.SurplusCompensation, input.HasPermanence, input.PermanenceMonths); err != nil {
		return domain.Offer{}, fmt.Errorf("%w: %s", ErrInvalidInput, err)
	}
	if input.IsCurrent {
		offer, err := s.repo.UpdateAsCurrent(ctx, id, input)
		if errors.Is(err, repository.ErrOfferNotFound) {
			return domain.Offer{}, ErrOfferNotFound
		}
		return offer, err
	}
	offer, err := s.repo.Update(ctx, id, input)
	if errors.Is(err, repository.ErrOfferNotFound) {
		return domain.Offer{}, ErrOfferNotFound
	}
	return offer, err
}

// DeleteOffer removes an offer by ID.
func (s *OfferService) DeleteOffer(ctx context.Context, id int64) error {
	err := s.repo.Delete(ctx, id)
	if errors.Is(err, repository.ErrOfferNotFound) {
		return ErrOfferNotFound
	}
	return err
}

// validateOfferInput is shared by CreateOffer and UpdateOffer to avoid duplication.
func validateOfferInput(
	name, provider string,
	peakKWh, midKWh, valleyKWh float64,
	powerPeak, powerValley float64,
	surplusCompensation float64,
	hasPermanence bool, permanenceMonths int,
) error {
	if name == "" {
		return errors.New("name is required")
	}
	if provider == "" {
		return errors.New("provider is required")
	}
	if peakKWh < 0 || midKWh < 0 || valleyKWh < 0 {
		return errors.New("energy prices must be non-negative")
	}
	if powerPeak < 0 || powerValley < 0 {
		return errors.New("power term prices must be non-negative")
	}
	if surplusCompensation < 0 {
		return errors.New("surplus_compensation must be non-negative")
	}
	if hasPermanence && permanenceMonths <= 0 {
		return errors.New("permanence_months must be greater than 0 when has_permanence is true")
	}
	return nil
}
