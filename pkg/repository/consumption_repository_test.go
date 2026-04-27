package repository_test

import (
	"context"
	"os"
	"testing"

	"github.com/carlos/energy-savings/pkg/database"
	"github.com/carlos/energy-savings/pkg/domain"
	"github.com/carlos/energy-savings/pkg/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func openTestDB(t *testing.T) *repository.ConsumptionRepository {
	t.Helper()
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		t.Skip("DATABASE_URL not set; skipping integration test")
	}
	ctx := context.Background()
	db, err := database.Open(ctx, connStr)
	require.NoError(t, err)
	_, err = db.ExecContext(ctx, `TRUNCATE TABLE offers, consumption_history RESTART IDENTITY CASCADE`)
	require.NoError(t, err)
	t.Cleanup(func() { db.Close() })
	return repository.NewConsumptionRepository(db)
}

func TestConsumptionRepository_ListEmpty(t *testing.T) {
	repo := openTestDB(t)
	months, err := repo.List(context.Background())
	require.NoError(t, err)
	assert.Empty(t, months)
}

func TestConsumptionRepository_UpsertAndList(t *testing.T) {
	repo := openTestDB(t)
	ctx := context.Background()

	input := []domain.MonthlyConsumption{
		{Month: 4, Year: 2025, PeakKWh: 100, MidKWh: 80, ValleyKWh: 60, PowerPeakKW: 3.45, PowerValleyKW: 3.45, SurplusKWh: 10},
		{Month: 5, Year: 2025, PeakKWh: 110, MidKWh: 90, ValleyKWh: 70, PowerPeakKW: 3.45, PowerValleyKW: 3.45, SurplusKWh: 0},
	}
	require.NoError(t, repo.Upsert(ctx, input))

	got, err := repo.List(ctx, 1)
	require.NoError(t, err)
	assert.Len(t, got, 2)
	// Ordered chronologically
	assert.Equal(t, 4, got[0].Month)
	assert.Equal(t, 5, got[1].Month)
	assert.InDelta(t, 100.0, got[0].PeakKWh, 0.001)
	assert.InDelta(t, 10.0, got[0].SurplusKWh, 0.001)
}

func TestConsumptionRepository_UpsertReplaces(t *testing.T) {
	repo := openTestDB(t)
	ctx := context.Background()

	original := []domain.MonthlyConsumption{
		{Month: 1, Year: 2026, PeakKWh: 50, MidKWh: 40, ValleyKWh: 30, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
	}
	require.NoError(t, repo.Upsert(ctx, original))

	updated := []domain.MonthlyConsumption{
		{Month: 1, Year: 2026, PeakKWh: 200, MidKWh: 150, ValleyKWh: 100, PowerPeakKW: 5.0, PowerValleyKW: 5.0, SurplusKWh: 20},
	}
	require.NoError(t, repo.Upsert(ctx, updated))

	got, err := repo.List(ctx, 1)
	require.NoError(t, err)
	assert.Len(t, got, 1)
	assert.InDelta(t, 200.0, got[0].PeakKWh, 0.001)
	assert.InDelta(t, 20.0, got[0].SurplusKWh, 0.001)
}

func TestConsumptionRepository_ListOrderedChronologically(t *testing.T) {
	repo := openTestDB(t)
	ctx := context.Background()

	// Insert out of order
	months := []domain.MonthlyConsumption{
		{Month: 3, Year: 2026, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
		{Month: 11, Year: 2025, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
		{Month: 1, Year: 2026, PowerPeakKW: 3.45, PowerValleyKW: 3.45},
	}
	require.NoError(t, repo.Upsert(ctx, months))

	got, err := repo.List(ctx, 1)
	require.NoError(t, err)
	require.Len(t, got, 3)
	assert.Equal(t, 11, got[0].Month)
	assert.Equal(t, 2025, got[0].Year)
	assert.Equal(t, 1, got[1].Month)
	assert.Equal(t, 2026, got[1].Year)
	assert.Equal(t, 3, got[2].Month)
	assert.Equal(t, 2026, got[2].Year)
}
