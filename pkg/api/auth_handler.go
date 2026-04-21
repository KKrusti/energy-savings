package api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/carlos/energy-savings/pkg/auth"
	"github.com/carlos/energy-savings/pkg/domain"
	"github.com/carlos/energy-savings/pkg/repository"
)

// authStore is the persistence interface for AuthHandler.
type authStore interface {
	CreateUser(ctx context.Context, username, email, passwordHash string) (int64, error)
	GetByUsername(ctx context.Context, username string) (*domain.User, error)
	GetByID(ctx context.Context, id int64) (*domain.User, error)
	UpdatePassword(ctx context.Context, userID int64, hash string) error
	RevokeToken(ctx context.Context, jti string, expiresAt time.Time) error
	IsTokenRevoked(ctx context.Context, jti string) (bool, error)
}

// AuthHandler handles registration, login, logout, and password changes.
type AuthHandler struct {
	store authStore
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(store authStore) *AuthHandler {
	return &AuthHandler{store: store}
}

// Register godoc — POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)
	if req.Username == "" || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusUnprocessableEntity, "username, email y password son requeridos")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusUnprocessableEntity, "la contraseña debe tener al menos 8 caracteres")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error interno")
		return
	}

	id, err := h.store.CreateUser(r.Context(), req.Username, req.Email, hash)
	if errors.Is(err, repository.ErrUsernameTaken) {
		writeError(w, http.StatusConflict, "el nombre de usuario ya está registrado")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al registrar usuario")
		return
	}

	token, err := auth.GenerateToken(id, false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al generar token")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"token":    token,
		"username": req.Username,
		"user_id":  id,
		"is_admin": false,
	})
}

// Login godoc — POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}

	user, err := h.store.GetByUsername(r.Context(), req.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error interno")
		return
	}
	if user == nil || auth.CheckPassword(req.Password, user.PasswordHash) != nil {
		writeError(w, http.StatusUnauthorized, "credenciales incorrectas")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.IsAdmin)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al generar token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"token":    token,
		"username": user.Username,
		"user_id":  user.ID,
		"is_admin": user.IsAdmin,
	})
}

// Logout godoc — POST /api/auth/logout
// Revokes the current JWT so it cannot be reused.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	token := bearerToken(r)
	if token == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	_, _, jti, expiresAt, err := auth.ValidateToken(token)
	if err != nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	_ = h.store.RevokeToken(r.Context(), jti, expiresAt)
	w.WriteHeader(http.StatusNoContent)
}

// ChangePassword godoc — POST /api/auth/password
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}
	if len(req.NewPassword) < 8 {
		writeError(w, http.StatusUnprocessableEntity, "la nueva contraseña debe tener al menos 8 caracteres")
		return
	}

	userID := UserIDFromContext(r.Context())
	user, err := h.store.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "error interno")
		return
	}

	if auth.CheckPassword(req.CurrentPassword, user.PasswordHash) != nil {
		writeError(w, http.StatusUnauthorized, "contraseña actual incorrecta")
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error interno")
		return
	}

	if err := h.store.UpdatePassword(r.Context(), userID, hash); err != nil {
		writeError(w, http.StatusInternalServerError, "error al actualizar contraseña")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
