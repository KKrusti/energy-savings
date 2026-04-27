// Package repository provides data-access implementations.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/carlos/energy-savings/pkg/domain"
)

// ErrOfferNotFound is returned when a requested offer does not exist.
var ErrOfferNotFound = errors.New("offer not found")

// ErrNotFound is an alias kept for backward compatibility with existing references.
// Deprecated: use ErrOfferNotFound directly.
var ErrNotFound = ErrOfferNotFound

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
	is_green_energy, notes, is_current, is_public, created_at, updated_at`

func scanOffer(row interface {
	Scan(...any) error
}) (domain.Offer, error) {
	var o domain.Offer
	err := row.Scan(
		&o.ID, &o.Name, &o.Provider,
		&o.EnergyPriceFlat, &o.EnergyPricePeakKWh, &o.EnergyPriceMidKWh, &o.EnergyPriceValleyKWh,
		&o.PowerTermSamePrice, &o.PowerTermPricePeak, &o.PowerTermPriceValley,
		&o.SurplusCompensation,
		&o.HasPermanence, &o.PermanenceMonths,
		&o.IsGreenEnergy, &o.Notes, &o.IsCurrent, &o.IsPublic, &o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		return domain.Offer{}, err
	}
	return o, nil
}

// Create inserts a new offer scoped to userID and returns it with generated ID and timestamps.
func (r *OfferRepository) Create(ctx context.Context, input domain.CreateOfferInput, userID int64) (domain.Offer, error) {
	const q = `
		INSERT INTO offers (
			name, provider,
			energy_price_flat, energy_price_peak_kwh, energy_price_mid_kwh, energy_price_valley_kwh,
			power_term_same_price, power_term_price_peak, power_term_price_valley,
			surplus_compensation,
			has_permanence, permanence_months,
			is_green_energy, notes, is_current, is_public, user_id
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
		RETURNING ` + selectCols

	row := r.db.QueryRowContext(ctx, q,
		input.Name, input.Provider,
		input.EnergyPriceFlat, input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh,
		input.PowerTermSamePrice, input.PowerTermPricePeak, input.PowerTermPriceValley,
		input.SurplusCompensation,
		input.HasPermanence, input.PermanenceMonths,
		input.IsGreenEnergy, input.Notes, input.IsCurrent, input.IsPublic, userID,
	)
	o, err := scanOffer(row)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("create offer: %w", err)
	}
	return o, nil
}

// GetByID returns the offer with the given ID scoped to userID, or ErrOfferNotFound.
func (r *OfferRepository) GetByID(ctx context.Context, id int64, userID int64) (domain.Offer, error) {
	q := `SELECT ` + selectCols + ` FROM offers WHERE id = $1 AND user_id = $2`
	o, err := scanOffer(r.db.QueryRowContext(ctx, q, id, userID))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Offer{}, ErrOfferNotFound
	}
	if err != nil {
		return domain.Offer{}, fmt.Errorf("get offer by id: %w", err)
	}
	return o, nil
}

// List returns all offers for the given userID ordered by creation date descending.
func (r *OfferRepository) List(ctx context.Context, userID int64) ([]domain.Offer, error) {
	q := `SELECT ` + selectCols + ` FROM offers WHERE user_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, q, userID)
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

// Update modifies an existing offer scoped to userID. Returns ErrOfferNotFound if it does not exist.
func (r *OfferRepository) Update(ctx context.Context, id int64, input domain.UpdateOfferInput, userID int64) (domain.Offer, error) {
	const q = `
		UPDATE offers SET
			name=$1, provider=$2,
			energy_price_flat=$3, energy_price_peak_kwh=$4, energy_price_mid_kwh=$5, energy_price_valley_kwh=$6,
			power_term_same_price=$7, power_term_price_peak=$8, power_term_price_valley=$9,
			surplus_compensation=$10,
			has_permanence=$11, permanence_months=$12,
			is_green_energy=$13, notes=$14, is_current=$15, is_public=$16
		WHERE id=$17 AND user_id=$18`

	res, err := r.db.ExecContext(ctx, q,
		input.Name, input.Provider,
		input.EnergyPriceFlat, input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh,
		input.PowerTermSamePrice, input.PowerTermPricePeak, input.PowerTermPriceValley,
		input.SurplusCompensation,
		input.HasPermanence, input.PermanenceMonths,
		input.IsGreenEnergy, input.Notes, input.IsCurrent, input.IsPublic,
		id, userID,
	)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("update offer: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.Offer{}, ErrOfferNotFound
	}
	return r.GetByID(ctx, id, userID)
}

// Delete removes an offer by ID scoped to userID. Returns ErrOfferNotFound if it does not exist.
func (r *OfferRepository) Delete(ctx context.Context, id int64, userID int64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM offers WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete offer: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrOfferNotFound
	}
	return nil
}

// UnsetCurrent clears the is_current flag on all offers for the given userID.
func (r *OfferRepository) UnsetCurrent(ctx context.Context, userID int64) error {
	_, err := r.db.ExecContext(ctx, `UPDATE offers SET is_current = FALSE WHERE is_current = TRUE AND user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("unset current offer: %w", err)
	}
	return nil
}

// CreateAsCurrent unsets any current offer for userID and creates the new one atomically.
func (r *OfferRepository) CreateAsCurrent(ctx context.Context, input domain.CreateOfferInput, userID int64) (domain.Offer, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("begin create-as-current transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.ExecContext(ctx, `UPDATE offers SET is_current = FALSE WHERE is_current = TRUE AND user_id = $1`, userID); err != nil {
		return domain.Offer{}, fmt.Errorf("unset current offer: %w", err)
	}

	const q = `
		INSERT INTO offers (
			name, provider,
			energy_price_flat, energy_price_peak_kwh, energy_price_mid_kwh, energy_price_valley_kwh,
			power_term_same_price, power_term_price_peak, power_term_price_valley,
			surplus_compensation,
			has_permanence, permanence_months,
			is_green_energy, notes, is_current, is_public, user_id
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
		RETURNING ` + selectCols

	row := tx.QueryRowContext(ctx, q,
		input.Name, input.Provider,
		input.EnergyPriceFlat, input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh,
		input.PowerTermSamePrice, input.PowerTermPricePeak, input.PowerTermPriceValley,
		input.SurplusCompensation,
		input.HasPermanence, input.PermanenceMonths,
		input.IsGreenEnergy, input.Notes, input.IsCurrent, input.IsPublic, userID,
	)
	o, err := scanOffer(row)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("create offer: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return domain.Offer{}, fmt.Errorf("commit create-as-current: %w", err)
	}
	return o, nil
}

// UpdateAsCurrent unsets any current offer for userID and updates the target offer atomically.
func (r *OfferRepository) UpdateAsCurrent(ctx context.Context, id int64, input domain.UpdateOfferInput, userID int64) (domain.Offer, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("begin update-as-current transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	if _, err := tx.ExecContext(ctx, `UPDATE offers SET is_current = FALSE WHERE is_current = TRUE AND user_id = $1`, userID); err != nil {
		return domain.Offer{}, fmt.Errorf("unset current offer: %w", err)
	}

	const q = `
		UPDATE offers SET
			name=$1, provider=$2,
			energy_price_flat=$3, energy_price_peak_kwh=$4, energy_price_mid_kwh=$5, energy_price_valley_kwh=$6,
			power_term_same_price=$7, power_term_price_peak=$8, power_term_price_valley=$9,
			surplus_compensation=$10,
			has_permanence=$11, permanence_months=$12,
			is_green_energy=$13, notes=$14, is_current=$15, is_public=$16
		WHERE id=$17 AND user_id=$18`

	res, err := tx.ExecContext(ctx, q,
		input.Name, input.Provider,
		input.EnergyPriceFlat, input.EnergyPricePeakKWh, input.EnergyPriceMidKWh, input.EnergyPriceValleyKWh,
		input.PowerTermSamePrice, input.PowerTermPricePeak, input.PowerTermPriceValley,
		input.SurplusCompensation,
		input.HasPermanence, input.PermanenceMonths,
		input.IsGreenEnergy, input.Notes, input.IsCurrent, input.IsPublic,
		id, userID,
	)
	if err != nil {
		return domain.Offer{}, fmt.Errorf("update offer: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.Offer{}, ErrOfferNotFound
	}

	q2 := `SELECT ` + selectCols + ` FROM offers WHERE id = $1 AND user_id = $2`
	o, err := scanOffer(tx.QueryRowContext(ctx, q2, id, userID))
	if err != nil {
		return domain.Offer{}, fmt.Errorf("read updated offer: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return domain.Offer{}, fmt.Errorf("commit update-as-current: %w", err)
	}
	return o, nil
}

// ListPublic returns all offers marked as public, ordered by creation date descending.
// This is intentionally not scoped to a single userID so any authenticated user can browse them.
func (r *OfferRepository) ListPublic(ctx context.Context) ([]domain.Offer, error) {
	q := `SELECT ` + selectCols + ` FROM offers WHERE is_public = TRUE ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list public offers: %w", err)
	}
	defer rows.Close()

	var offers []domain.Offer
	for rows.Next() {
		o, err := scanOffer(rows)
		if err != nil {
			return nil, fmt.Errorf("scan public offer: %w", err)
		}
		offers = append(offers, o)
	}
	return offers, rows.Err()
}

// GetPublicByID returns the public offer with the given ID, or ErrOfferNotFound.
// Does not filter by userID — used for the import flow where any user can read a public offer.
func (r *OfferRepository) GetPublicByID(ctx context.Context, id int64) (domain.Offer, error) {
	q := `SELECT ` + selectCols + ` FROM offers WHERE id = $1 AND is_public = TRUE`
	o, err := scanOffer(r.db.QueryRowContext(ctx, q, id))
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Offer{}, ErrOfferNotFound
	}
	if err != nil {
		return domain.Offer{}, fmt.Errorf("get public offer by id: %w", err)
	}
	return o, nil
}
