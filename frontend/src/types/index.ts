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
}

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
