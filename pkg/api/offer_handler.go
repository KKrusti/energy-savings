package api

import (
	"context"
	"errors"
	"net/http"
	"strconv"

	"github.com/carlos/energy-savings/pkg/domain"
	"github.com/carlos/energy-savings/pkg/service"
	"github.com/go-chi/chi/v5"
)

// offerService is the interface OfferHandler depends on.
type offerService interface {
	CreateOffer(ctx context.Context, input domain.CreateOfferInput, userID int64) (domain.Offer, error)
	GetOffer(ctx context.Context, id int64, userID int64) (domain.Offer, error)
	ListOffers(ctx context.Context, userID int64) ([]domain.Offer, error)
	UpdateOffer(ctx context.Context, id int64, input domain.UpdateOfferInput, userID int64) (domain.Offer, error)
	DeleteOffer(ctx context.Context, id int64, userID int64) error
	ListPublicOffers(ctx context.Context) ([]domain.Offer, error)
	ImportOffer(ctx context.Context, sourceID int64, userID int64) (domain.Offer, error)
}

// OfferHandler handles HTTP requests for offers.
type OfferHandler struct {
	svc offerService
}

// NewOfferHandler creates a new OfferHandler.
func NewOfferHandler(svc offerService) *OfferHandler {
	return &OfferHandler{svc: svc}
}

// List godoc - GET /api/offers
func (h *OfferHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFromContext(r.Context())
	offers, err := h.svc.ListOffers(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al listar ofertas")
		return
	}
	if offers == nil {
		offers = []domain.Offer{}
	}
	writeJSON(w, http.StatusOK, offers)
}

// Get godoc - GET /api/offers/{id}
func (h *OfferHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	userID := UserIDFromContext(r.Context())
	offer, err := h.svc.GetOffer(r.Context(), id, userID)
	if errors.Is(err, service.ErrOfferNotFound) {
		writeError(w, http.StatusNotFound, "oferta no encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al obtener oferta")
		return
	}
	writeJSON(w, http.StatusOK, offer)
}

// Create godoc - POST /api/offers
func (h *OfferHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateOfferInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}
	userID := UserIDFromContext(r.Context())
	offer, err := h.svc.CreateOffer(r.Context(), input, userID)
	if errors.Is(err, service.ErrInvalidInput) {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al crear oferta")
		return
	}
	writeJSON(w, http.StatusCreated, offer)
}

// Update godoc - PUT /api/offers/{id}
func (h *OfferHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var input domain.UpdateOfferInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "body inválido")
		return
	}
	userID := UserIDFromContext(r.Context())
	offer, err := h.svc.UpdateOffer(r.Context(), id, input, userID)
	if errors.Is(err, service.ErrOfferNotFound) {
		writeError(w, http.StatusNotFound, "oferta no encontrada")
		return
	}
	if errors.Is(err, service.ErrInvalidInput) {
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al actualizar oferta")
		return
	}
	writeJSON(w, http.StatusOK, offer)
}

// Delete godoc - DELETE /api/offers/{id}
func (h *OfferHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	userID := UserIDFromContext(r.Context())
	err = h.svc.DeleteOffer(r.Context(), id, userID)
	if errors.Is(err, service.ErrOfferNotFound) {
		writeError(w, http.StatusNotFound, "oferta no encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al eliminar oferta")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func parseID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		return 0, err
	}
	if id <= 0 {
		return 0, errors.New("id must be a positive integer")
	}
	return id, nil
}

// ListPublic godoc - GET /api/offers/public
func (h *OfferHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	offers, err := h.svc.ListPublicOffers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al listar ofertas públicas")
		return
	}
	if offers == nil {
		offers = []domain.Offer{}
	}
	writeJSON(w, http.StatusOK, offers)
}

// Import godoc - POST /api/offers/{id}/import
func (h *OfferHandler) Import(w http.ResponseWriter, r *http.Request) {
	id, err := parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	userID := UserIDFromContext(r.Context())
	offer, err := h.svc.ImportOffer(r.Context(), id, userID)
	if errors.Is(err, service.ErrOfferNotFound) {
		writeError(w, http.StatusNotFound, "oferta pública no encontrada")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "error al importar oferta")
		return
	}
	writeJSON(w, http.StatusCreated, offer)
}
