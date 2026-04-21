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
	CreateOffer(ctx context.Context, input domain.CreateOfferInput) (domain.Offer, error)
	GetOffer(ctx context.Context, id int64) (domain.Offer, error)
	ListOffers(ctx context.Context) ([]domain.Offer, error)
	UpdateOffer(ctx context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error)
	DeleteOffer(ctx context.Context, id int64) error
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
	offers, err := h.svc.ListOffers(r.Context())
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
	offer, err := h.svc.GetOffer(r.Context(), id)
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
	offer, err := h.svc.CreateOffer(r.Context(), input)
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
	offer, err := h.svc.UpdateOffer(r.Context(), id, input)
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
	err = h.svc.DeleteOffer(r.Context(), id)
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
