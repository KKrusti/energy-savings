package service_test

import (
	"context"
	"errors"
	"testing"

	"github.com/carlos/energy-savings/internal/domain"
	"github.com/carlos/energy-savings/internal/repository"
	"github.com/carlos/energy-savings/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockOfferRepo implements the offerRepo interface for testing.
type mockOfferRepo struct {
	offers map[int64]domain.Offer
	nextID int64
}

func newMockRepo() *mockOfferRepo {
	return &mockOfferRepo{offers: make(map[int64]domain.Offer), nextID: 1}
}

func (m *mockOfferRepo) Create(_ context.Context, input domain.CreateOfferInput) (domain.Offer, error) {
	o := domain.Offer{
		ID: m.nextID, Name: input.Name, Provider: input.Provider,
		EnergyPriceFlat:      input.EnergyPriceFlat,
		EnergyPricePeakKWh:   input.EnergyPricePeakKWh,
		EnergyPriceMidKWh:    input.EnergyPriceMidKWh,
		EnergyPriceValleyKWh: input.EnergyPriceValleyKWh,
		PowerTermSamePrice:   input.PowerTermSamePrice,
		PowerTermPricePeak:   input.PowerTermPricePeak,
		PowerTermPriceValley: input.PowerTermPriceValley,
		SurplusCompensation:  input.SurplusCompensation,
		HasPermanence:        input.HasPermanence,
		PermanenceMonths:     input.PermanenceMonths,
		IsGreenEnergy:        input.IsGreenEnergy,
		Notes:                input.Notes,
		IsCurrent:            input.IsCurrent,
	}
	m.offers[m.nextID] = o
	m.nextID++
	return o, nil
}

func (m *mockOfferRepo) GetByID(_ context.Context, id int64) (domain.Offer, error) {
	if o, ok := m.offers[id]; ok {
		return o, nil
	}
	return domain.Offer{}, repository.ErrNotFound
}

func (m *mockOfferRepo) List(_ context.Context) ([]domain.Offer, error) {
	result := make([]domain.Offer, 0, len(m.offers))
	for _, o := range m.offers {
		result = append(result, o)
	}
	return result, nil
}

func (m *mockOfferRepo) Update(_ context.Context, id int64, input domain.UpdateOfferInput) (domain.Offer, error) {
	if _, ok := m.offers[id]; !ok {
		return domain.Offer{}, repository.ErrNotFound
	}
	o := domain.Offer{
		ID: id, Name: input.Name, Provider: input.Provider,
		EnergyPriceFlat: input.EnergyPriceFlat, EnergyPricePeakKWh: input.EnergyPricePeakKWh,
		PowerTermSamePrice: input.PowerTermSamePrice, PowerTermPricePeak: input.PowerTermPricePeak,
		IsCurrent: input.IsCurrent,
	}
	m.offers[id] = o
	return o, nil
}

func (m *mockOfferRepo) Delete(_ context.Context, id int64) error {
	if _, ok := m.offers[id]; !ok {
		return repository.ErrNotFound
	}
	delete(m.offers, id)
	return nil
}

// UnsetCurrent clears IsCurrent on all offers in the mock store.
func (m *mockOfferRepo) UnsetCurrent(_ context.Context) error {
	for id, o := range m.offers {
		if o.IsCurrent {
			o.IsCurrent = false
			m.offers[id] = o
		}
	}
	return nil
}

func validInput() domain.CreateOfferInput {
	return domain.CreateOfferInput{
		Name: "Test", Provider: "Endesa",
		EnergyPriceFlat: true, EnergyPricePeakKWh: 0.12,
		PowerTermSamePrice: true, PowerTermPricePeak: 38.04,
	}
}

func TestOfferService_CreateOffer(t *testing.T) {
	tests := []struct {
		name    string
		input   domain.CreateOfferInput
		wantErr error
	}{
		{
			name:  "valid offer",
			input: validInput(),
		},
		{
			name:    "missing name",
			input:   func() domain.CreateOfferInput { i := validInput(); i.Name = ""; return i }(),
			wantErr: service.ErrInvalidInput,
		},
		{
			name:    "missing provider",
			input:   func() domain.CreateOfferInput { i := validInput(); i.Provider = ""; return i }(),
			wantErr: service.ErrInvalidInput,
		},
		{
			name:    "negative energy price",
			input:   func() domain.CreateOfferInput { i := validInput(); i.EnergyPricePeakKWh = -1; return i }(),
			wantErr: service.ErrInvalidInput,
		},
		{
			name:    "negative power price",
			input:   func() domain.CreateOfferInput { i := validInput(); i.PowerTermPricePeak = -1; return i }(),
			wantErr: service.ErrInvalidInput,
		},
		{
			name: "valid with permanence",
			input: func() domain.CreateOfferInput {
				i := validInput()
				i.HasPermanence = true
				i.PermanenceMonths = 12
				return i
			}(),
		},
		{
			name: "invalid permanence months",
			input: func() domain.CreateOfferInput {
				i := validInput()
				i.HasPermanence = true
				i.PermanenceMonths = 0
				return i
			}(),
			wantErr: service.ErrInvalidInput,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			svc := service.NewOfferService(newMockRepo())
			offer, err := svc.CreateOffer(context.Background(), tc.input)
			if tc.wantErr != nil {
				require.Error(t, err)
				assert.True(t, errors.Is(err, tc.wantErr))
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.input.Name, offer.Name)
		})
	}
}

func TestOfferService_GetOffer(t *testing.T) {
	svc := service.NewOfferService(newMockRepo())
	ctx := context.Background()

	created, err := svc.CreateOffer(ctx, validInput())
	require.NoError(t, err)

	t.Run("found", func(t *testing.T) {
		got, err := svc.GetOffer(ctx, created.ID)
		require.NoError(t, err)
		assert.Equal(t, created.ID, got.ID)
	})

	t.Run("not found", func(t *testing.T) {
		_, err := svc.GetOffer(ctx, 9999)
		assert.ErrorIs(t, err, service.ErrOfferNotFound)
	})
}

func TestOfferService_DeleteOffer(t *testing.T) {
	svc := service.NewOfferService(newMockRepo())
	ctx := context.Background()

	created, _ := svc.CreateOffer(ctx, validInput())
	assert.NoError(t, svc.DeleteOffer(ctx, created.ID))
	assert.ErrorIs(t, svc.DeleteOffer(ctx, created.ID), service.ErrOfferNotFound)
}

func TestOfferService_IsCurrent_CreateTransfersFlag(t *testing.T) {
	svc := service.NewOfferService(newMockRepo())
	ctx := context.Background()

	// Create first offer marked as current.
	inp1 := validInput()
	inp1.IsCurrent = true
	first, err := svc.CreateOffer(ctx, inp1)
	require.NoError(t, err)
	assert.True(t, first.IsCurrent)

	// Create second offer also marked as current — first must lose the flag.
	inp2 := validInput()
	inp2.Name = "Other Offer"
	inp2.IsCurrent = true
	second, err := svc.CreateOffer(ctx, inp2)
	require.NoError(t, err)
	assert.True(t, second.IsCurrent)

	// The first offer should no longer be current.
	got, err := svc.GetOffer(ctx, first.ID)
	require.NoError(t, err)
	assert.False(t, got.IsCurrent, "first offer should no longer be current after a new current offer is created")
}

func TestOfferService_IsCurrent_UpdateTransfersFlag(t *testing.T) {
	svc := service.NewOfferService(newMockRepo())
	ctx := context.Background()

	// Create two offers; mark the first as current.
	inp1 := validInput()
	inp1.IsCurrent = true
	first, err := svc.CreateOffer(ctx, inp1)
	require.NoError(t, err)

	inp2 := validInput()
	inp2.Name = "Second"
	second, err := svc.CreateOffer(ctx, inp2)
	require.NoError(t, err)
	assert.False(t, second.IsCurrent)

	// Update second offer to be current — first must lose the flag.
	updInput := domain.UpdateOfferInput{
		Name: second.Name, Provider: second.Provider,
		EnergyPriceFlat: true, EnergyPricePeakKWh: 0.12,
		PowerTermSamePrice: true, PowerTermPricePeak: 38.04,
		IsCurrent: true,
	}
	updated, err := svc.UpdateOffer(ctx, second.ID, updInput)
	require.NoError(t, err)
	assert.True(t, updated.IsCurrent)

	got, err := svc.GetOffer(ctx, first.ID)
	require.NoError(t, err)
	assert.False(t, got.IsCurrent, "first offer should no longer be current after update")
}

func TestOfferService_IsCurrent_FalseDoesNotUnset(t *testing.T) {
	svc := service.NewOfferService(newMockRepo())
	ctx := context.Background()

	// Create offer marked as current.
	inp := validInput()
	inp.IsCurrent = true
	current, err := svc.CreateOffer(ctx, inp)
	require.NoError(t, err)

	// Create another offer NOT marked as current — current offer must remain current.
	inp2 := validInput()
	inp2.Name = "Other"
	inp2.IsCurrent = false
	_, err = svc.CreateOffer(ctx, inp2)
	require.NoError(t, err)

	got, err := svc.GetOffer(ctx, current.ID)
	require.NoError(t, err)
	assert.True(t, got.IsCurrent, "current offer should remain current when new offer is not marked current")
}
