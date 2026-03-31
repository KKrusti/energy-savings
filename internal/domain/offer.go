// Package domain defines the core business entities.
package domain

import "time"

// Offer represents an electricity tariff offer from a provider.
type Offer struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Provider string `json:"provider"`

	// Energy pricing — either flat (same price 24h) or three-period (peak/mid/valley).
	EnergyPriceFlat      bool    `json:"energy_price_flat"`       // true = single price for all periods
	EnergyPricePeakKWh   float64 `json:"energy_price_peak_kwh"`   // punta  €/kWh
	EnergyPriceMidKWh    float64 `json:"energy_price_mid_kwh"`    // llano  €/kWh
	EnergyPriceValleyKWh float64 `json:"energy_price_valley_kwh"` // valle  €/kWh

	// Power term pricing — either same price for both periods or peak/valley split.
	PowerTermSamePrice   bool    `json:"power_term_same_price"`   // true = same price for peak and valley
	PowerTermPricePeak   float64 `json:"power_term_price_peak"`   // punta €/kW/día
	PowerTermPriceValley float64 `json:"power_term_price_valley"` // valle €/kW/día

	// Surplus solar compensation.
	SurplusCompensation float64 `json:"surplus_compensation"` // €/kWh

	// Permanence commitment.
	HasPermanence    bool `json:"has_permanence"`
	PermanenceMonths int  `json:"permanence_months"`

	IsGreenEnergy bool   `json:"is_green_energy"`
	Notes         string `json:"notes"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateOfferInput contains the data required to create a new offer.
type CreateOfferInput struct {
	Name     string `json:"name"`
	Provider string `json:"provider"`

	EnergyPriceFlat      bool    `json:"energy_price_flat"`
	EnergyPricePeakKWh   float64 `json:"energy_price_peak_kwh"`
	EnergyPriceMidKWh    float64 `json:"energy_price_mid_kwh"`
	EnergyPriceValleyKWh float64 `json:"energy_price_valley_kwh"`

	PowerTermSamePrice   bool    `json:"power_term_same_price"`
	PowerTermPricePeak   float64 `json:"power_term_price_peak"`
	PowerTermPriceValley float64 `json:"power_term_price_valley"`

	SurplusCompensation float64 `json:"surplus_compensation"`

	HasPermanence    bool `json:"has_permanence"`
	PermanenceMonths int  `json:"permanence_months"`

	IsGreenEnergy bool   `json:"is_green_energy"`
	Notes         string `json:"notes"`
}

// UpdateOfferInput contains the fields that can be updated on an offer.
type UpdateOfferInput struct {
	Name     string `json:"name"`
	Provider string `json:"provider"`

	EnergyPriceFlat      bool    `json:"energy_price_flat"`
	EnergyPricePeakKWh   float64 `json:"energy_price_peak_kwh"`
	EnergyPriceMidKWh    float64 `json:"energy_price_mid_kwh"`
	EnergyPriceValleyKWh float64 `json:"energy_price_valley_kwh"`

	PowerTermSamePrice   bool    `json:"power_term_same_price"`
	PowerTermPricePeak   float64 `json:"power_term_price_peak"`
	PowerTermPriceValley float64 `json:"power_term_price_valley"`

	SurplusCompensation float64 `json:"surplus_compensation"`

	HasPermanence    bool `json:"has_permanence"`
	PermanenceMonths int  `json:"permanence_months"`

	IsGreenEnergy bool   `json:"is_green_energy"`
	Notes         string `json:"notes"`
}
