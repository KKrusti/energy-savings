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
	PowerTerm      float64 `json:"power_term"`      // potencia × precio × días/365
	SurplusCredit  float64 `json:"surplus_credit"`  // excedentes × compensación (negativo)
	ElectricityTax float64 `json:"electricity_tax"` // impuesto electricidad 5.11269%
	MeterRental    float64 `json:"meter_rental"`    // alquiler contador
	IVA            float64 `json:"iva"`             // IVA 21%
	Total          float64 `json:"total"`           // total final
}

// SimulationResponse wraps one or many BillBreakdown results.
type SimulationResponse struct {
	Breakdowns []BillBreakdown `json:"breakdowns"`
}
