package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/carlos/energy-savings/pkg/domain"
	"github.com/jackc/pgx/v5/pgconn"
)

// ErrUserNotFound is returned when a requested user does not exist.
var ErrUserNotFound = errors.New("user not found")

// ErrUsernameTaken is returned when a username is already registered.
var ErrUsernameTaken = errors.New("username already taken")

// UserRepository handles user persistence.
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// CreateUser inserts a new user and returns the generated ID.
func (r *UserRepository) CreateUser(ctx context.Context, username, email, passwordHash string) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
		username, email, passwordHash,
	).Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return 0, ErrUsernameTaken
		}
		return 0, fmt.Errorf("create user: %w", err)
	}
	return id, nil
}

// GetByUsername returns the user with the given username, or nil if not found.
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	var u domain.User
	err := r.db.QueryRowContext(ctx,
		`SELECT id, username, email, password_hash, is_admin, created_at FROM users WHERE username = $1`,
		username,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.IsAdmin, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by username: %w", err)
	}
	return &u, nil
}

// GetByID returns the user with the given ID, or nil if not found.
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	var u domain.User
	err := r.db.QueryRowContext(ctx,
		`SELECT id, username, email, password_hash, is_admin, created_at FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.IsAdmin, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &u, nil
}

// UpdatePassword replaces the stored password hash.
func (r *UserRepository) UpdatePassword(ctx context.Context, userID int64, hash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET password_hash = $1 WHERE id = $2`,
		hash, userID,
	)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

// RevokeToken records a JWT JTI as revoked until its expiry.
func (r *UserRepository) RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING`,
		jti, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("revoke token: %w", err)
	}
	return nil
}

// CleanupExpiredTokens removes revoked tokens whose expiry has already passed.
// Safe to call periodically; expired tokens can no longer be used regardless.
func (r *UserRepository) CleanupExpiredTokens(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM revoked_tokens WHERE expires_at < NOW()`)
	if err != nil {
		return fmt.Errorf("cleanup expired tokens: %w", err)
	}
	return nil
}

// IsTokenRevoked returns true if the given JTI has been revoked.
func (r *UserRepository) IsTokenRevoked(ctx context.Context, jti string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE jti = $1)`,
		jti,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check revoked token: %w", err)
	}
	return exists, nil
}
