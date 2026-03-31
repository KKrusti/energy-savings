package repository_test

import (
	"context"
	"testing"

	"github.com/carlos/energy-savings/internal/database"
	"github.com/carlos/energy-savings/internal/domain"
	"github.com/carlos/energy-savings/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestRepo(t *testing.T) *repository.OfferRepository {
	t.Helper()
	ctx := context.Background()
	db, err := database.Open(ctx, ":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return repository.NewOfferRepository(db)
}

func baseInput() domain.CreateOfferInput {
	return domain.CreateOfferInput{
		Name:                 "Tarifa Plana",
		Provider:             "Endesa",
		EnergyPriceFlat:      true,
		EnergyPricePeakKWh:   0.15,
		EnergyPriceMidKWh:    0.15,
		EnergyPriceValleyKWh: 0.15,
		PowerTermSamePrice:   true,
		PowerTermPricePeak:   38.04,
		PowerTermPriceValley: 38.04,
		SurplusCompensation:  0.06,
	}
}

func TestOfferRepository_Create(t *testing.T) {
	tests := []struct {
		name    string
		input   domain.CreateOfferInput
		wantErr bool
	}{
		{
			name:  "flat energy price",
			input: baseInput(),
		},
		{
			name: "tiered energy price",
			input: domain.CreateOfferInput{
				Name: "Tarifa Discriminación", Provider: "Iberdrola",
				EnergyPriceFlat:      false,
				EnergyPricePeakKWh:   0.22,
				EnergyPriceMidKWh:    0.16,
				EnergyPriceValleyKWh: 0.09,
				PowerTermSamePrice:   false,
				PowerTermPricePeak:   42.0,
				PowerTermPriceValley: 10.0,
			},
		},
		{
			name: "with permanence",
			input: domain.CreateOfferInput{
				Name: "Fidelización", Provider: "Naturgy",
				EnergyPriceFlat:    true,
				EnergyPricePeakKWh: 0.12,
				PowerTermSamePrice: true,
				PowerTermPricePeak: 35.0,
				HasPermanence:      true,
				PermanenceMonths:   12,
			},
		},
		{
			name: "green energy with no permanence",
			input: domain.CreateOfferInput{
				Name: "Green Plus", Provider: "Holaluz",
				EnergyPriceFlat:    true,
				EnergyPricePeakKWh: 0.14,
				PowerTermSamePrice: true,
				PowerTermPricePeak: 36.0,
				IsGreenEnergy:      true,
				Notes:              "100% renewable",
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := newTestRepo(t)
			offer, err := repo.Create(context.Background(), tc.input)
			if tc.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Positive(t, offer.ID)
			assert.Equal(t, tc.input.Name, offer.Name)
			assert.Equal(t, tc.input.EnergyPriceFlat, offer.EnergyPriceFlat)
			assert.Equal(t, tc.input.EnergyPricePeakKWh, offer.EnergyPricePeakKWh)
			assert.Equal(t, tc.input.PowerTermSamePrice, offer.PowerTermSamePrice)
			assert.Equal(t, tc.input.HasPermanence, offer.HasPermanence)
			assert.Equal(t, tc.input.PermanenceMonths, offer.PermanenceMonths)
			assert.False(t, offer.CreatedAt.IsZero())
		})
	}
}

func TestOfferRepository_GetByID(t *testing.T) {
	repo := newTestRepo(t)
	ctx := context.Background()

	created, err := repo.Create(ctx, baseInput())
	require.NoError(t, err)

	t.Run("found", func(t *testing.T) {
		got, err := repo.GetByID(ctx, created.ID)
		require.NoError(t, err)
		assert.Equal(t, created.ID, got.ID)
		assert.Equal(t, created.EnergyPricePeakKWh, got.EnergyPricePeakKWh)
	})

	t.Run("not found", func(t *testing.T) {
		_, err := repo.GetByID(ctx, 9999)
		assert.ErrorIs(t, err, repository.ErrNotFound)
	})
}

func TestOfferRepository_List(t *testing.T) {
	repo := newTestRepo(t)
	ctx := context.Background()

	list, err := repo.List(ctx)
	require.NoError(t, err)
	assert.Empty(t, list)

	for _, name := range []string{"Offer A", "Offer B", "Offer C"} {
		inp := baseInput()
		inp.Name = name
		_, err := repo.Create(ctx, inp)
		require.NoError(t, err)
	}

	list, err = repo.List(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 3)
}

func TestOfferRepository_Update(t *testing.T) {
	repo := newTestRepo(t)
	ctx := context.Background()

	created, err := repo.Create(ctx, baseInput())
	require.NoError(t, err)

	t.Run("update to tiered pricing", func(t *testing.T) {
		updated, err := repo.Update(ctx, created.ID, domain.UpdateOfferInput{
			Name: "Updated", Provider: "New Provider",
			EnergyPriceFlat:      false,
			EnergyPricePeakKWh:   0.25,
			EnergyPriceMidKWh:    0.18,
			EnergyPriceValleyKWh: 0.10,
			PowerTermSamePrice:   false,
			PowerTermPricePeak:   45.0,
			PowerTermPriceValley: 12.0,
			HasPermanence:        true,
			PermanenceMonths:     24,
		})
		require.NoError(t, err)
		assert.Equal(t, "Updated", updated.Name)
		assert.False(t, updated.EnergyPriceFlat)
		assert.InDelta(t, 0.25, updated.EnergyPricePeakKWh, 0.001)
		assert.True(t, updated.HasPermanence)
		assert.Equal(t, 24, updated.PermanenceMonths)
	})

	t.Run("not found", func(t *testing.T) {
		_, err := repo.Update(ctx, 9999, domain.UpdateOfferInput{Name: "X", Provider: "X"})
		assert.ErrorIs(t, err, repository.ErrNotFound)
	})
}

func TestOfferRepository_Delete(t *testing.T) {
	repo := newTestRepo(t)
	ctx := context.Background()

	created, err := repo.Create(ctx, baseInput())
	require.NoError(t, err)

	t.Run("successful delete", func(t *testing.T) {
		require.NoError(t, repo.Delete(ctx, created.ID))
		_, err = repo.GetByID(ctx, created.ID)
		assert.ErrorIs(t, err, repository.ErrNotFound)
	})

	t.Run("not found", func(t *testing.T) {
		assert.ErrorIs(t, repo.Delete(ctx, 9999), repository.ErrNotFound)
	})
}
