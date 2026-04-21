package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/carlos/energy-savings/internal/domain"
)

// ConsumptionRepository persists monthly consumption history to PostgreSQL.
type ConsumptionRepository struct {
	db *sql.DB
}

// NewConsumptionRepository creates a new ConsumptionRepository.
func NewConsumptionRepository(db *sql.DB) *ConsumptionRepository {
	return &ConsumptionRepository{db: db}
}

// Upsert inserts or replaces all entries in the slice.
// Each (month, year) pair is treated as a natural key; existing rows are fully replaced.
func (r *ConsumptionRepository) Upsert(ctx context.Context, months []domain.MonthlyConsumption) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin upsert transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	const q = `
		INSERT INTO consumption_history
			(month, year, peak_kwh, mid_kwh, valley_kwh, power_peak_kw, power_valley_kw, surplus_kwh)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (month, year) DO UPDATE SET
			peak_kwh        = EXCLUDED.peak_kwh,
			mid_kwh         = EXCLUDED.mid_kwh,
			valley_kwh      = EXCLUDED.valley_kwh,
			power_peak_kw   = EXCLUDED.power_peak_kw,
			power_valley_kw = EXCLUDED.power_valley_kw,
			surplus_kwh     = EXCLUDED.surplus_kwh,
			updated_at      = NOW()`

	for _, m := range months {
		if _, err := tx.ExecContext(ctx, q,
			m.Month, m.Year,
			m.PeakKWh, m.MidKWh, m.ValleyKWh,
			m.PowerPeakKW, m.PowerValleyKW,
			m.SurplusKWh,
		); err != nil {
			return fmt.Errorf("upsert month %d/%d: %w", m.Month, m.Year, err)
		}
	}

	return tx.Commit()
}

// List returns all saved monthly consumption entries ordered chronologically (year, month ASC).
func (r *ConsumptionRepository) List(ctx context.Context) ([]domain.MonthlyConsumption, error) {
	const q = `
		SELECT month, year, peak_kwh, mid_kwh, valley_kwh, power_peak_kw, power_valley_kw, surplus_kwh
		FROM consumption_history
		ORDER BY year ASC, month ASC`

	rows, err := r.db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list consumption history: %w", err)
	}
	defer rows.Close()

	var result []domain.MonthlyConsumption
	for rows.Next() {
		var m domain.MonthlyConsumption
		if err := rows.Scan(
			&m.Month, &m.Year,
			&m.PeakKWh, &m.MidKWh, &m.ValleyKWh,
			&m.PowerPeakKW, &m.PowerValleyKW,
			&m.SurplusKWh,
		); err != nil {
			return nil, fmt.Errorf("scan consumption row: %w", err)
		}
		result = append(result, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate consumption rows: %w", err)
	}

	return result, nil
}
