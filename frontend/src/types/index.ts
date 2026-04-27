export interface Offer {
  id: number
  name: string
  provider: string
  // Energy pricing
  energy_price_flat: boolean
  energy_price_peak_kwh: number
  energy_price_mid_kwh: number
  energy_price_valley_kwh: number
  // Power pricing
  power_term_same_price: boolean
  power_term_price_peak: number
  power_term_price_valley: number
  // Surplus
  surplus_compensation: number
  // Permanence
  has_permanence: boolean
  permanence_months: number
  // Other
  is_green_energy: boolean
  notes: string
  // Current tariff flag — only one offer can have this set to true at a time
  is_current: boolean
  // Public flag — when true, other authenticated users can discover and import this offer
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface CreateOfferInput {
  name: string
  provider: string
  energy_price_flat: boolean
  energy_price_peak_kwh: number
  energy_price_mid_kwh: number
  energy_price_valley_kwh: number
  power_term_same_price: boolean
  power_term_price_peak: number
  power_term_price_valley: number
  surplus_compensation: number
  has_permanence: boolean
  permanence_months: number
  is_green_energy: boolean
  notes: string
  // Setting this to true will unset any previously current offer (handled by the backend).
  is_current: boolean
  // When true, other authenticated users can discover and import this offer.
  is_public: boolean
}

// UpdateOfferInput mirrors CreateOfferInput — all fields are required on update (full replacement).
export type UpdateOfferInput = CreateOfferInput

export interface SimulationRequest {
  offer_id?: number
  consumption_kwh: number
  contracted_power_kw: number
  surplus_kwh: number
  days_in_period: number
}

export interface BillBreakdown {
  offer_id: number
  offer_name: string
  provider: string
  energy_term: number
  power_term: number
  surplus_credit: number
  electricity_tax: number
  meter_rental: number
  iva: number
  total: number
}

export interface SimulationResponse {
  breakdowns: BillBreakdown[]
}

// Annual simulation types

export interface MonthlyConsumption {
  month: number       // 1-12
  year: number
  peak_kwh: number
  mid_kwh: number
  valley_kwh: number
  power_peak_kw: number    // contracted power — peak period (kW)
  power_valley_kw: number  // contracted power — valley period (kW)
  surplus_kwh: number      // solar surplus injected to grid (kWh)
  /** VAT rate as a fraction for this month (e.g. 0.10). 0 means use the system default (21%). */
  iva_rate: number
}

export interface AnnualSimulationRequest {
  months: MonthlyConsumption[]
}

export interface MonthlyBillBreakdown extends BillBreakdown {
  month: number
  year: number
  energy_peak_term: number
  energy_mid_term: number
  energy_valley_term: number
  // Raw consumption inputs — echoed back for itemised receipt rendering
  peak_kwh: number
  mid_kwh: number
  valley_kwh: number
  power_peak_kw: number
  power_valley_kw: number
  surplus_kwh: number
  days: number
  // Unit prices used
  price_peak_kwh: number
  price_mid_kwh: number
  price_valley_kwh: number
  price_power_peak: number
  price_power_valley: number
  price_surplus: number
  iva_rate_used: number
}

export interface AnnualOfferResult {
  offer_id: number
  offer_name: string
  provider: string
  months: MonthlyBillBreakdown[]
  year_total: number
}

export interface AnnualSimulationResponse {
  offers: AnnualOfferResult[]
}

export interface ConsumptionHistoryResponse {
  months: MonthlyConsumption[]
}

// Auth types

export interface AuthUser {
  user_id: number
  username: string
  is_admin: boolean
}

export interface AuthResponse {
  token: string
  username: string
  user_id: number
  is_admin: boolean
}
