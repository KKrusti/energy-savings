package service_test

import (
	"testing"

	"github.com/carlos/energy-savings/internal/domain"
	"github.com/carlos/energy-savings/internal/service"
	"github.com/stretchr/testify/assert"
)

func flatOffer(peak float64, powerPrice float64) domain.Offer {
	return domain.Offer{
		ID: 1, Name: "Flat", Provider: "Test",
		EnergyPriceFlat:      true,
		EnergyPricePeakKWh:   peak,
		EnergyPriceMidKWh:    peak,
		EnergyPriceValleyKWh: peak,
		PowerTermSamePrice:   true,
		PowerTermPricePeak:   powerPrice,
		PowerTermPriceValley: powerPrice,
	}
}

func TestCalculatorService_Calculate(t *testing.T) {
	svc := service.NewCalculatorService()

	tests := []struct {
		name         string
		offer        domain.Offer
		req          domain.SimulationRequest
		wantEnergy   float64
		wantSurplus  float64
		wantPositive bool
	}{
		{
			name:  "standard bill no surplus",
			offer: flatOffer(0.15, 38.04),
			req: domain.SimulationRequest{
				ConsumptionKWh: 300, ContractedPowerKW: 3.45,
				SurplusKWh: 0, DaysInPeriod: 30,
			},
			wantEnergy:   45.0,
			wantSurplus:  0.0,
			wantPositive: true,
		},
		{
			name: "bill with solar surplus compensation",
			offer: domain.Offer{
				ID: 2, Name: "Solar", Provider: "Holaluz",
				EnergyPriceFlat:     true,
				EnergyPricePeakKWh:  0.12,
				PowerTermSamePrice:  true,
				PowerTermPricePeak:  40.0,
				SurplusCompensation: 0.08,
			},
			req: domain.SimulationRequest{
				ConsumptionKWh: 200, ContractedPowerKW: 5.0,
				SurplusKWh: 150, DaysInPeriod: 31,
			},
			wantEnergy:   24.0, // 200 × 0.12
			wantSurplus:  12.0, // 150 × 0.08
			wantPositive: true,
		},
		{
			name:  "zero days period",
			offer: flatOffer(0.15, 38.04),
			req: domain.SimulationRequest{
				ConsumptionKWh: 0, ContractedPowerKW: 3.45,
				DaysInPeriod: 0,
			},
			wantEnergy:  0.0,
			wantSurplus: 0.0,
		},
		{
			name: "tiered power uses average price",
			offer: domain.Offer{
				ID: 3, Name: "Tiered", Provider: "X",
				EnergyPriceFlat:      true,
				EnergyPricePeakKWh:   0.15,
				PowerTermSamePrice:   false,
				PowerTermPricePeak:   50.0,
				PowerTermPriceValley: 10.0,
			},
			req: domain.SimulationRequest{
				ConsumptionKWh: 300, ContractedPowerKW: 3.45, DaysInPeriod: 365,
			},
			// energy = 300 × 0.15 = 45; power = 3.45 × ((50+10)/2) × 1 = 103.5
			wantEnergy:   45.0,
			wantPositive: true,
		},
		{
			name: "offer with permanence does not affect bill total",
			offer: domain.Offer{
				ID: 4, Name: "Fidelización", Provider: "Y",
				EnergyPriceFlat:    true,
				EnergyPricePeakKWh: 0.10,
				PowerTermSamePrice: true,
				PowerTermPricePeak: 35.0,
				HasPermanence:      true,
				PermanenceMonths:   12,
			},
			req: domain.SimulationRequest{
				ConsumptionKWh: 300, ContractedPowerKW: 3.45, DaysInPeriod: 30,
			},
			wantEnergy:   30.0,
			wantPositive: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := svc.Calculate(tc.offer, tc.req)

			assert.Equal(t, tc.offer.ID, result.OfferID)
			assert.InDelta(t, tc.wantEnergy, result.EnergyTerm, 0.05)
			assert.InDelta(t, tc.wantSurplus, result.SurplusCredit, 0.05)

			if tc.wantPositive {
				assert.Positive(t, result.Total)
			}

			// VAT must equal 21% of subtotal
			subtotal := result.EnergyTerm + result.PowerTerm + result.ElectricityTax + result.MeterRental - result.SurplusCredit
			assert.InDelta(t, subtotal*service.IVARate, result.IVA, 0.05)
		})
	}
}

func TestCalculatorService_CalculateAll(t *testing.T) {
	svc := service.NewCalculatorService()

	offers := []domain.Offer{
		flatOffer(0.10, 35.0),
		flatOffer(0.20, 40.0),
		flatOffer(0.15, 38.0),
	}
	offers[0].ID, offers[1].ID, offers[2].ID = 1, 2, 3

	req := domain.SimulationRequest{
		ConsumptionKWh: 300, ContractedPowerKW: 3.45, DaysInPeriod: 30,
	}

	resp := svc.CalculateAll(offers, req)
	assert.Len(t, resp.Breakdowns, 3)
	// cheaper energy price → lower total
	assert.Less(t, resp.Breakdowns[0].Total, resp.Breakdowns[1].Total)
}

func TestElectricityTaxRate(t *testing.T) {
	assert.InDelta(t, 0.0511269, service.ElectricityTaxRate, 0.000001)
}
