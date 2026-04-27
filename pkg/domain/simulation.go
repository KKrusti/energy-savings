// Package domain defines the core business entities.
package domain

// SimulationRequest holds the consumption data to simulate a bill.
type SimulationRequest struct {
	OfferID           int64   `json:"offer_id"`            // 0 = simular todas las ofertas
	ConsumptionKWh    float64 `json:"consumption_kwh"`     // kWh consumidos en el período
	ContractedPowerKW float64 `json:"contracted_power_kw"` // kW de potencia contratada
	SurplusKWh        float64 `json:"surplus_kwh"`         // kWh excedentes volcados a red
	DaysInPeriod      int     `json:"days_in_period"`      // días del período de facturación
}

// BillBreakdown contains the itemized result for a single offer.
type BillBreakdown struct {
	OfferID        int64   `json:"offer_id"`
	OfferName      string  `json:"offer_name"`
	Provider       string  `json:"provider"`
	EnergyTerm     float64 `json:"energy_term"`     // consumo × precio_kwh
	PowerTerm      float64 `json:"power_term"`      // potencia × precio (€/kW/día) × días
	SurplusCredit  float64 `json:"surplus_credit"`  // excedentes × compensación (negativo)
	ElectricityTax float64 `json:"electricity_tax"` // impuesto electricidad 5.11269%
	MeterRental    float64 `json:"meter_rental"`    // alquiler contador
	IVA            float64 `json:"iva"`             // IVA (rate configurable per request)
	Total          float64 `json:"total"`           // total final
}

// SimulationResponse wraps one or many BillBreakdown results.
type SimulationResponse struct {
	Breakdowns []BillBreakdown `json:"breakdowns"`
}

// MonthlyConsumption holds tiered consumption data for one calendar month.
// Power has two contracted periods (peak and valley) matching the two power-term
// pricing periods used by Spanish electricity tariffs.
// Days is derived automatically from Month and Year; it is not supplied by the client.
type MonthlyConsumption struct {
	Month         int     `json:"month"` // 1–12
	Year          int     `json:"year"`
	PeakKWh       float64 `json:"peak_kwh"`        // kWh consumed in peak period
	MidKWh        float64 `json:"mid_kwh"`         // kWh consumed in mid period
	ValleyKWh     float64 `json:"valley_kwh"`      // kWh consumed in valley period
	PowerPeakKW   float64 `json:"power_peak_kw"`   // contracted power — peak period (kW)
	PowerValleyKW float64 `json:"power_valley_kw"` // contracted power — valley period (kW)
	SurplusKWh    float64 `json:"surplus_kwh"`     // kWh of solar surplus injected to grid
	IVARate       float64 `json:"iva_rate"`         // VAT fraction for this month (e.g. 0.10); 0 means use the system default (21%)
	Days          int     `json:"-"`               // billing days — derived from Month+Year, never serialised
}

// AnnualSimulationRequest holds up to 12 months of tiered consumption data.
type AnnualSimulationRequest struct {
	Months []MonthlyConsumption `json:"months"`
}

// MonthlyBillBreakdown extends BillBreakdown with the month and year it belongs to,
// per-period energy cost breakdown for chart visualisation, and the raw input values
// so the client can render a full itemised receipt (kWh × price = cost).
type MonthlyBillBreakdown struct {
	BillBreakdown
	Month            int     `json:"month"`
	Year             int     `json:"year"`
	EnergyPeakTerm   float64 `json:"energy_peak_term"`   // peak kWh × peak price
	EnergyMidTerm    float64 `json:"energy_mid_term"`    // mid kWh × mid price
	EnergyValleyTerm float64 `json:"energy_valley_term"` // valley kWh × valley price
	// Raw consumption inputs — echoed back so the client can display itemised receipts.
	PeakKWh       float64 `json:"peak_kwh"`
	MidKWh        float64 `json:"mid_kwh"`
	ValleyKWh     float64 `json:"valley_kwh"`
	PowerPeakKW   float64 `json:"power_peak_kw"`
	PowerValleyKW float64 `json:"power_valley_kw"`
	SurplusKWh    float64 `json:"surplus_kwh"`
	// Unit prices used — echoed back for the itemised receipt.
	PricePeakKWh     float64 `json:"price_peak_kwh"`
	PriceMidKWh      float64 `json:"price_mid_kwh"`
	PriceValleyKWh   float64 `json:"price_valley_kwh"`
	PricePowerPeak   float64 `json:"price_power_peak"`
	PricePowerValley float64 `json:"price_power_valley"`
	PriceSurplus     float64 `json:"price_surplus"`
	IVARateUsed      float64 `json:"iva_rate_used"` // actual VAT fraction applied to this month
	Days             int     `json:"days"`
}

// AnnualOfferResult contains the 12 monthly breakdowns for a single offer.
type AnnualOfferResult struct {
	OfferID   int64                  `json:"offer_id"`
	OfferName string                 `json:"offer_name"`
	Provider  string                 `json:"provider"`
	Months    []MonthlyBillBreakdown `json:"months"`
	YearTotal float64                `json:"year_total"` // sum of all monthly totals
}

// AnnualSimulationResponse contains per-offer annual results for all registered offers.
type AnnualSimulationResponse struct {
	Offers []AnnualOfferResult `json:"offers"`
}

// ConsumptionHistoryResponse wraps the list of saved monthly consumption entries.
type ConsumptionHistoryResponse struct {
	Months []MonthlyConsumption `json:"months"`
}

// SaveHistoryRequest is the request body for PUT /api/consumption/history.
// Kept as a separate type from ConsumptionHistoryResponse to respect SRP:
// the response type may evolve (e.g. pagination, metadata) independently of the write contract.
type SaveHistoryRequest struct {
	Months []MonthlyConsumption `json:"months"`
}
