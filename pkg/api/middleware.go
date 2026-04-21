package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/carlos/energy-savings/pkg/auth"
)

type contextKey int

const userIDKey contextKey = iota

// tokenChecker is a narrow interface for revocation checks.
type tokenChecker interface {
	IsTokenRevoked(ctx context.Context, jti string) (bool, error)
}

// RequireAuth validates the Bearer JWT and injects the user ID into the context.
func RequireAuth(checker tokenChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				writeError(w, http.StatusUnauthorized, "token requerido")
				return
			}

			userID, _, jti, _, err := auth.ValidateToken(token)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "token inválido")
				return
			}

			revoked, err := checker.IsTokenRevoked(r.Context(), jti)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "error de autenticación")
				return
			}
			if revoked {
				writeError(w, http.StatusUnauthorized, "token revocado")
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDFromContext extracts the authenticated user ID from the request context.
// Panics if called outside a RequireAuth-protected handler.
func UserIDFromContext(ctx context.Context) int64 {
	return ctx.Value(userIDKey).(int64)
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(h, "Bearer ")
}
