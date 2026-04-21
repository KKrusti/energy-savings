// Package service contains the business logic layer.
package service

import (
	"math"

	"github.com/carlos/energy-savings/pkg/domain"
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

	// Power term: contracted power (kW) × daily price (€/kW/day) × days
	powerTerm := req.ContractedPowerKW * powerPrice * float64(req.DaysInPeriod)

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

// CalculateMonthly returns an itemized BillBreakdown for a single offer using real
// tiered consumption data (peak/mid/valley kWh) for one calendar month.
//
// Energy: when EnergyPriceFlat each kWh is billed at EnergyPricePeakKWh;
// otherwise each period's kWh is multiplied by its own price.
//
// Power: when PowerTermSamePrice both contracted-power values use the same price;
// otherwise PowerPeakKW uses PowerTermPricePeak and PowerValleyKW uses PowerTermPriceValley.
func (s *CalculatorService) CalculateMonthly(offer domain.Offer, m domain.MonthlyConsumption) domain.BillBreakdown {
	var energyTerm float64
	if offer.EnergyPriceFlat {
		totalKWh := m.PeakKWh + m.MidKWh + m.ValleyKWh
		energyTerm = totalKWh * offer.EnergyPricePeakKWh
	} else {
		energyTerm = m.PeakKWh*offer.EnergyPricePeakKWh +
			m.MidKWh*offer.EnergyPriceMidKWh +
			m.ValleyKWh*offer.EnergyPriceValleyKWh
	}

	var powerTerm float64
	if offer.PowerTermSamePrice {
		powerTerm = (m.PowerPeakKW + m.PowerValleyKW) * offer.PowerTermPricePeak * float64(m.Days)
	} else {
		powerTerm = m.PowerPeakKW*offer.PowerTermPricePeak*float64(m.Days) +
			m.PowerValleyKW*offer.PowerTermPriceValley*float64(m.Days)
	}

	// Surplus solar credit (negative item on the bill)
	surplusCredit := m.SurplusKWh * offer.SurplusCompensation

	meterRental := MeterRentalDailyRate * float64(m.Days)
	electricityTax := (energyTerm + powerTerm) * ElectricityTaxRate
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

// CalculateAnnual returns an AnnualSimulationResponse for all offers over the provided months.
func (s *CalculatorService) CalculateAnnual(offers []domain.Offer, req domain.AnnualSimulationRequest) domain.AnnualSimulationResponse {
	results := make([]domain.AnnualOfferResult, 0, len(offers))
	for _, o := range offers {
		months := make([]domain.MonthlyBillBreakdown, 0, len(req.Months))
		var yearTotal float64
		for _, m := range req.Months {
			bd := s.CalculateMonthly(o, m)

			// Per-period energy terms for chart visualisation
			var peakTerm, midTerm, valleyTerm float64
			if o.EnergyPriceFlat {
				total := m.PeakKWh + m.MidKWh + m.ValleyKWh
				// Distribute proportionally to kWh when flat
				if total > 0 {
					peakTerm = round2(m.PeakKWh / total * bd.EnergyTerm)
					midTerm = round2(m.MidKWh / total * bd.EnergyTerm)
					valleyTerm = round2(bd.EnergyTerm - peakTerm - midTerm)
				}
			} else {
				peakTerm = round2(m.PeakKWh * o.EnergyPricePeakKWh)
				midTerm = round2(m.MidKWh * o.EnergyPriceMidKWh)
				valleyTerm = round2(m.ValleyKWh * o.EnergyPriceValleyKWh)
			}

			months = append(months, domain.MonthlyBillBreakdown{
				BillBreakdown:    bd,
				Month:            m.Month,
				Year:             m.Year,
				EnergyPeakTerm:   peakTerm,
				EnergyMidTerm:    midTerm,
				EnergyValleyTerm: valleyTerm,
				// Raw inputs echoed back for itemised receipt rendering.
				PeakKWh:       m.PeakKWh,
				MidKWh:        m.MidKWh,
				ValleyKWh:     m.ValleyKWh,
				PowerPeakKW:   m.PowerPeakKW,
				PowerValleyKW: m.PowerValleyKW,
				SurplusKWh:    m.SurplusKWh,
				Days:          m.Days,
				// Unit prices used for each line item.
				PricePeakKWh:     o.EnergyPricePeakKWh,
				PriceMidKWh:      o.EnergyPriceMidKWh,
				PriceValleyKWh:   o.EnergyPriceValleyKWh,
				PricePowerPeak:   o.PowerTermPricePeak,
				PricePowerValley: o.PowerTermPriceValley,
				PriceSurplus:     o.SurplusCompensation,
			})
			yearTotal += bd.Total
		}
		results = append(results, domain.AnnualOfferResult{
			OfferID:   o.ID,
			OfferName: o.Name,
			Provider:  o.Provider,
			Months:    months,
			YearTotal: round2(yearTotal),
		})
	}
	return domain.AnnualSimulationResponse{Offers: results}
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
