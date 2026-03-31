// Package service contains the business logic layer.
package service

import (
	"math"

	"github.com/carlos/energy-savings/internal/domain"
)

const (
	// ElectricityTaxRate is the Spanish special electricity tax (5.11269%).
	ElectricityTaxRate = 0.0511269
	// IVARate is the VAT rate applied to electricity bills in Spain (21%).
	IVARate = 0.21
	// MeterRentalDailyRate is the daily meter rental cost in €.
	MeterRentalDailyRate = 0.026557
)

// CalculatorService computes the electricity bill breakdown for a given offer and consumption.
type CalculatorService struct{}

// NewCalculatorService creates a new CalculatorService.
func NewCalculatorService() *CalculatorService {
	return &CalculatorService{}
}

// Calculate returns an itemized BillBreakdown for a single offer.
//
// Energy pricing: when EnergyPriceFlat is true all consumption uses EnergyPricePeakKWh
// (which equals the other periods). When false, peak price is used as a conservative
// single-period estimate until per-period consumption data is supported.
//
// Power pricing: when PowerTermSamePrice is true PowerTermPricePeak is used for the full
// contracted power. When false the average of peak and valley prices is used.
func (s *CalculatorService) Calculate(offer domain.Offer, req domain.SimulationRequest) domain.BillBreakdown {
	energyPrice := effectiveEnergyPrice(offer)
	powerPrice := effectivePowerPrice(offer)

	// Energy term: consumption (kWh) × unit price (€/kWh)
	energyTerm := req.ConsumptionKWh * energyPrice

	// Power term: contracted power (kW) × annual price (€/kW/year) × days/365
	powerTerm := req.ContractedPowerKW * powerPrice * (float64(req.DaysInPeriod) / 365.0)

	// Surplus solar credit (negative item on the bill)
	surplusCredit := req.SurplusKWh * offer.SurplusCompensation

	// Meter rental
	meterRental := MeterRentalDailyRate * float64(req.DaysInPeriod)

	// Electricity tax base = energy + power terms
	electricityTax := (energyTerm + powerTerm) * ElectricityTaxRate

	// Subtotal before VAT
	subtotal := energyTerm + powerTerm + electricityTax + meterRental - surplusCredit

	iva := subtotal * IVARate
	total := subtotal + iva

	return domain.BillBreakdown{
		OfferID:        offer.ID,
		OfferName:      offer.Name,
		Provider:       offer.Provider,
		EnergyTerm:     round2(energyTerm),
		PowerTerm:      round2(powerTerm),
		SurplusCredit:  round2(surplusCredit),
		ElectricityTax: round2(electricityTax),
		MeterRental:    round2(meterRental),
		IVA:            round2(iva),
		Total:          round2(total),
	}
}

// CalculateAll returns a breakdown for every offer in the slice.
func (s *CalculatorService) CalculateAll(offers []domain.Offer, req domain.SimulationRequest) domain.SimulationResponse {
	breakdowns := make([]domain.BillBreakdown, 0, len(offers))
	for _, o := range offers {
		breakdowns = append(breakdowns, s.Calculate(o, req))
	}
	return domain.SimulationResponse{Breakdowns: breakdowns}
}

// effectiveEnergyPrice returns the representative energy price for simulation.
// When flat, all periods share the same price (EnergyPricePeakKWh).
// When tiered, the average of the three periods is used as an unweighted estimate
// until per-period consumption data is supported.
func effectiveEnergyPrice(o domain.Offer) float64 {
	if o.EnergyPriceFlat {
		return o.EnergyPricePeakKWh
	}
	return (o.EnergyPricePeakKWh + o.EnergyPriceMidKWh + o.EnergyPriceValleyKWh) / 3
}

// effectivePowerPrice returns the single power term price to use in calculations.
// When same price, peak is returned. When split, the average of peak and valley is used.
func effectivePowerPrice(o domain.Offer) float64 {
	if o.PowerTermSamePrice {
		return o.PowerTermPricePeak
	}
	return (o.PowerTermPricePeak + o.PowerTermPriceValley) / 2
}

// round2 rounds a float to 2 decimal places using banker's-rounding-safe math.Round.
func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
