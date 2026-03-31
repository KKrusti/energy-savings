import type {
  Offer,
  CreateOfferInput,
  UpdateOfferInput,
  AnnualSimulationRequest,
  AnnualSimulationResponse,
  ConsumptionHistoryResponse,
} from '@/types'

const BASE = '/api'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Offers
export const offersApi = {
  list: () => request<Offer[]>('/offers'),
  get: (id: number) => request<Offer>(`/offers/${id}`),
  create: (data: CreateOfferInput) =>
    request<Offer>('/offers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: UpdateOfferInput) =>
    request<Offer>(`/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/offers/${id}`, { method: 'DELETE' }),
}

// Simulation
export const simulationApi = {
  simulateAnnual: (data: AnnualSimulationRequest) =>
    request<AnnualSimulationResponse>('/simulate/annual', { method: 'POST', body: JSON.stringify(data) }),
}

// Consumption history
export const consumptionApi = {
  getHistory: () => request<ConsumptionHistoryResponse>('/consumption/history'),
  saveHistory: (data: ConsumptionHistoryResponse) =>
    request<void>('/consumption/history', { method: 'PUT', body: JSON.stringify(data) }),
}
