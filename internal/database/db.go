// Package database handles SQLite connection and schema migrations.
package database

import (
	"context"
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

// Open returns a configured *sql.DB backed by SQLite at the given path.
// Use ":memory:" for in-memory databases (useful in tests).
func Open(ctx context.Context, path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	db.SetMaxOpenConns(1) // SQLite supports only one writer at a time
	db.SetMaxIdleConns(1)

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	// Enable WAL for better read/write concurrency and foreign-key enforcement.
	if _, err := db.ExecContext(ctx, "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;"); err != nil {
		return nil, fmt.Errorf("configure sqlite pragmas: %w", err)
	}

	if err := migrate(ctx, db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return db, nil
}

type migration struct {
	version int
	stmts   []string
}

// migrations must be listed in ascending version order.
// Never modify an existing migration — add a new one instead.
var migrations = []migration{
	{
		version: 1,
		stmts: []string{
			`CREATE TABLE IF NOT EXISTS offers (
				id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
				name                 TEXT     NOT NULL,
				provider             TEXT     NOT NULL,
				energy_price_kwh     REAL     NOT NULL DEFAULT 0,
				power_term_price     REAL     NOT NULL DEFAULT 0,
				surplus_compensation REAL     NOT NULL DEFAULT 0,
				is_green_energy      INTEGER  NOT NULL DEFAULT 0,
				notes                TEXT     NOT NULL DEFAULT '',
				created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`,
			`CREATE TRIGGER IF NOT EXISTS offers_updated_at
				AFTER UPDATE ON offers
				BEGIN
					UPDATE offers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
				END`,
		},
	},
	{
		version: 2,
		stmts: []string{
			// Energy tiered pricing
			`ALTER TABLE offers ADD COLUMN energy_price_flat      INTEGER NOT NULL DEFAULT 1`,
			`ALTER TABLE offers ADD COLUMN energy_price_peak_kwh  REAL    NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN energy_price_mid_kwh   REAL    NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN energy_price_valley_kwh REAL   NOT NULL DEFAULT 0`,
			// Power tiered pricing
			`ALTER TABLE offers ADD COLUMN power_term_same_price   INTEGER NOT NULL DEFAULT 1`,
			`ALTER TABLE offers ADD COLUMN power_term_price_peak   REAL    NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN power_term_price_valley REAL    NOT NULL DEFAULT 0`,
			// Permanence
			`ALTER TABLE offers ADD COLUMN has_permanence     INTEGER NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN permanence_months  INTEGER NOT NULL DEFAULT 0`,
			// Migrate existing rows: copy legacy single-price fields into the new columns
			`UPDATE offers SET
				energy_price_peak_kwh   = energy_price_kwh,
				energy_price_mid_kwh    = energy_price_kwh,
				energy_price_valley_kwh = energy_price_kwh,
				power_term_price_peak   = power_term_price,
				power_term_price_valley = power_term_price
			WHERE energy_price_peak_kwh = 0`,
		},
	},
}

func migrate(ctx context.Context, db *sql.DB) error {
	var version int
	if err := db.QueryRowContext(ctx, "PRAGMA user_version").Scan(&version); err != nil {
		return fmt.Errorf("read user_version: %w", err)
	}

	for _, m := range migrations {
		if m.version <= version {
			continue
		}
		if err := applyMigration(ctx, db, m); err != nil {
			return err
		}
	}
	return nil
}

// applyMigration runs all statements of a single migration inside a transaction
// and updates user_version atomically. If any statement fails the transaction is
// rolled back, leaving the database in the previous consistent state.
func applyMigration(ctx context.Context, db *sql.DB, m migration) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration v%d: %w", m.version, err)
	}
	defer tx.Rollback() //nolint:errcheck // intentional best-effort rollback

	for _, stmt := range m.stmts {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("migration v%d: %w", m.version, err)
		}
	}
	// PRAGMA user_version cannot run inside a transaction in some SQLite drivers;
	// commit first then update the version.
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration v%d: %w", m.version, err)
	}
	if _, err := db.ExecContext(ctx, fmt.Sprintf("PRAGMA user_version = %d", m.version)); err != nil {
		return fmt.Errorf("set user_version %d: %w", m.version, err)
	}
	return nil
}
