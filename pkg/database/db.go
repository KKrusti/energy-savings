// Package database handles PostgreSQL connection and schema migrations.
package database

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Open returns a configured *sql.DB backed by Neon PostgreSQL.
// connStr must be a valid PostgreSQL connection string (e.g. from DATABASE_URL).
func Open(ctx context.Context, connStr string) (*sql.DB, error) {
	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}

	// Conservative pool for serverless: short-lived instances share connections via Neon pooler.
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(5)

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	if err := migrate(ctx, db); err != nil {
		db.Close()
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
				id                   BIGSERIAL        PRIMARY KEY,
				name                 TEXT             NOT NULL,
				provider             TEXT             NOT NULL,
				energy_price_kwh     DOUBLE PRECISION NOT NULL DEFAULT 0,
				power_term_price     DOUBLE PRECISION NOT NULL DEFAULT 0,
				surplus_compensation DOUBLE PRECISION NOT NULL DEFAULT 0,
				is_green_energy      BOOLEAN          NOT NULL DEFAULT FALSE,
				notes                TEXT             NOT NULL DEFAULT '',
				created_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
				updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW()
			)`,
			`CREATE OR REPLACE FUNCTION update_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = NOW();
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql`,
			`CREATE OR REPLACE TRIGGER offers_updated_at
				BEFORE UPDATE ON offers
				FOR EACH ROW EXECUTE FUNCTION update_updated_at()`,
		},
	},
	{
		version: 2,
		stmts: []string{
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS energy_price_flat       BOOLEAN          NOT NULL DEFAULT TRUE`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS energy_price_peak_kwh   DOUBLE PRECISION NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS energy_price_mid_kwh    DOUBLE PRECISION NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS energy_price_valley_kwh DOUBLE PRECISION NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS power_term_same_price   BOOLEAN          NOT NULL DEFAULT TRUE`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS power_term_price_peak   DOUBLE PRECISION NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS power_term_price_valley DOUBLE PRECISION NOT NULL DEFAULT 0`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS has_permanence          BOOLEAN          NOT NULL DEFAULT FALSE`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS permanence_months       INTEGER          NOT NULL DEFAULT 0`,
			`UPDATE offers SET
				energy_price_peak_kwh   = energy_price_kwh,
				energy_price_mid_kwh    = energy_price_kwh,
				energy_price_valley_kwh = energy_price_kwh,
				power_term_price_peak   = power_term_price,
				power_term_price_valley = power_term_price
			WHERE energy_price_peak_kwh = 0`,
		},
	},
	{
		version: 3,
		stmts: []string{
			`CREATE TABLE IF NOT EXISTS consumption_history (
				id              BIGSERIAL        PRIMARY KEY,
				month           INTEGER          NOT NULL CHECK (month BETWEEN 1 AND 12),
				year            INTEGER          NOT NULL,
				peak_kwh        DOUBLE PRECISION NOT NULL DEFAULT 0,
				mid_kwh         DOUBLE PRECISION NOT NULL DEFAULT 0,
				valley_kwh      DOUBLE PRECISION NOT NULL DEFAULT 0,
				power_peak_kw   DOUBLE PRECISION NOT NULL DEFAULT 0,
				power_valley_kw DOUBLE PRECISION NOT NULL DEFAULT 0,
				surplus_kwh     DOUBLE PRECISION NOT NULL DEFAULT 0,
				updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
				UNIQUE (month, year)
			)`,
			`CREATE OR REPLACE TRIGGER consumption_history_updated_at
				BEFORE UPDATE ON consumption_history
				FOR EACH ROW EXECUTE FUNCTION update_updated_at()`,
		},
	},
	{
		version: 4,
		stmts: []string{
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE`,
		},
	},
	{
		version: 5,
		stmts: []string{
			`CREATE TABLE IF NOT EXISTS users (
				id            BIGSERIAL    PRIMARY KEY,
				username      TEXT         NOT NULL UNIQUE,
				email         TEXT         NOT NULL UNIQUE,
				password_hash TEXT         NOT NULL,
				is_admin      BOOLEAN      NOT NULL DEFAULT FALSE,
				created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
			)`,
			`CREATE TABLE IF NOT EXISTS revoked_tokens (
				jti        TEXT        PRIMARY KEY,
				expires_at TIMESTAMPTZ NOT NULL
			)`,
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE`,
			`ALTER TABLE consumption_history ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE`,
			`ALTER TABLE consumption_history DROP CONSTRAINT IF EXISTS consumption_history_month_year_key`,
			`CREATE UNIQUE INDEX IF NOT EXISTS consumption_history_user_month_year_idx
				ON consumption_history (user_id, month, year) NULLS NOT DISTINCT`,
		},
	},
	{
		version: 6,
		stmts: []string{
			`ALTER TABLE consumption_history ADD COLUMN IF NOT EXISTS iva_rate DOUBLE PRECISION NOT NULL DEFAULT 0`,
		},
	},
	{
		version: 7,
		stmts: []string{
			`ALTER TABLE offers ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE`,
		},
	},
}

func migrate(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	var version int
	if err := db.QueryRowContext(ctx, `SELECT COALESCE(MAX(version), 0) FROM schema_migrations`).Scan(&version); err != nil {
		return fmt.Errorf("read schema version: %w", err)
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

// applyMigration runs all statements of a migration inside a transaction and records
// the version in schema_migrations atomically. Any failure rolls back the entire migration.
func applyMigration(ctx context.Context, db *sql.DB, m migration) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration v%d: %w", m.version, err)
	}
	defer tx.Rollback() //nolint:errcheck

	for _, stmt := range m.stmts {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("migration v%d: %w", m.version, err)
		}
	}

	if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, m.version); err != nil {
		return fmt.Errorf("record migration v%d: %w", m.version, err)
	}

	return tx.Commit()
}
