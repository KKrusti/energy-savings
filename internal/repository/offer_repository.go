// Package repository provides data-access implementations.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/carlos/energy-savings/internal/domain"
)

// ErrNotFound is returned when a requested offer does not exist.
var ErrNotFound = errors.New("offer not found")

// OfferRepository handles persistence of Offer entities.
type OfferRepository struct {
	db *sql.DB
}

// NewOfferRepository creates a new OfferRepository backed by the given DB.
func NewOfferRepository(db *sql.DB) *OfferRepository {
	return &OfferRepository{db: db}
}

const selectCols = `
	id, name, provider,
	energy_price_flat, energy_price_peak_kwh, energy_price_mid_kwh, energy_price_valley_kwh,
	power_term_same_price, power_term_price_peak, power_term_price_valley,
	surplus_compensation,
	has_permanence, permanence_months,
	is_green_energy, notes, created_at, updated_at`

func scanOffer(row interface {
	Scan(...any) error
}) (domain.Offer, error) {
	var o domain.Offer
	var energyFlat, powerSame, greenInt, permanenceInt int
	err := row.Scan(
		&o.ID, &o.Name, &o.Provider,
		&energyFlat, &o.EnergyPricePeakKWh, &o.EnergyPriceMidKWh, &o.EnergyPriceValleyKWh,
		&powerSame, &o.PowerTermPricePeak, &o.PowerTermPriceValley,
		&o.SurplusCompensation,
		&permanenceInt, &o.PermanenceMonths,
		&greenInt, &o.Notes, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return domain.Offer{}, err
	}
	o.EnergyPriceFlat = energyFlat != 0
	o.PowerTermSamePrice = powerSame != 0
	o.IsGreenEnergy = greenInt != 0
	o.HasPermanence = permanenceInt != 0
	return o, nil
}

// Create inserts a new offer and returns it with its generated ID and timestamps.
func (r *OfferRepository) Create(ctx context.Context, input domain.CreateOfferInput) (domain.Offer, error) {
	const q = `
		INSERT INTO offers (
			name, provider,
			energy_price_flat, energy_price_peak_kwh, energy_price_mid_kwh, energy_price_valley_kwh,
			power_term_same_price, power_term_price_peak, power_term_price_valley,
			surplus_compensation,
			has_permanence, permanence_months,
			is_green_energy, notes
		) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
		RETURNING ` + selectCols

	row := r.db.QueryRowContext(ctx, q,
		input.Name, input.Provider,
		boolToInt(input.EnergyPriceFlat), input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh,
		boolToInt(input.PowerTermSamePrice), input.PowerTermPricePeak, input.PowerTermPriceValley,
		input.SurplusCompensation,
		boolToInt(input.HasPermanence), input.PermanenceMonths,
		boolToInt(input.IsGreenEnergy), input.Notes,
	)
	o, err := scanOffer(row)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("create offer: %w", err)
	}
	return o, nil
}

// GetByID returns the offer with the given ID or ErrNotFound.
func (r *OfferRepository) GetByID(ctx context.Context, id int64) (domain.Offer, error) {
	q := `SELECT ` + selectCols + ` FROM offers WHERE id = ?`
	o, err := scanOffer(r.db.QueryRowContext(ctx, q, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Offer{}, ErrNotFound
	}
	if err != nil {
		return domain.Offer{}, fmt.Errorf("get offer by id: %w", err)
	}
	return o, nil
}

// List returns all offers ordered by creation date descending.
func (r *OfferRepository) List(ctx context.Context) ([]domain.Offer, error) {
	q := `SELECT ` + selectCols + ` FROM offers ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list offers: %w", err)
	}
	defer rows.Close()

	var offers []domain.Offer
	for rows.Next() {
		o, err := scanOffer(rows)
		if err != nil {
			return nil, fmt.Errorf("scan offer: %w", err)
		}
		offers = append(offers, o)
	}
	return offers, rows.Err()
}

// Update modifies an existing offer. Returns ErrNotFound if it does not exist.
func (r *OfferRepository) Update(ctx context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error) {
	const q = `
		UPDATE offers SET
			name=?, provider=?,
			energy_price_flat=?, energy_price_peak_kwh=?, energy_price_mid_kwh=?, energy_price_valley_kwh=?,
			power_term_same_price=?, power_term_price_peak=?, power_term_price_valley=?,
			surplus_compensation=?,
			has_permanence=?, permanence_months=?,
			is_green_energy=?, notes=?
		WHERE id=?`

	res, err := r.db.ExecContext(ctx, q,
		input.Name, input.Provider,
		boolToInt(input.EnergyPriceFlat), input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh,
		boolToInt(input.PowerTermSamePrice), input.PowerTermPricePeak, input.PowerTermPriceValley,
		input.SurplusCompensation,
		boolToInt(input.HasPermanence), input.PermanenceMonths,
		boolToInt(input.IsGreenEnergy), input.Notes,
		id,
	)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("update offer: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.Offer{}, ErrNotFound
	}
	return r.GetByID(ctx, id)
}

// Delete removes an offer by ID. Returns ErrNotFound if it does not exist.
func (r *OfferRepository) Delete(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM offers WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete offer: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
