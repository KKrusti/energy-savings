import type {
  Offer,
  CreateOfferInput,
  UpdateOfferInput,
  AnnualSimulationRequest,
  AnnualSimulationResponse,
  ConsumptionHistoryResponse,
  UserProfile,
} from '@/types'

const BASE = '/api'
const TOKEN_KEY = 'auth_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:expired'))
    throw new Error('Sesión expirada')
  }

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
  listPublic: () => request<Offer[]>('/offers/public'),
  import: (id: number) => request<Offer>(`/offers/${id}/import`, { method: 'POST' }),
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

// User profile
export const profileApi = {
  get: () => request<UserProfile>('/auth/profile'),
  update: (data: Partial<Pick<UserProfile, 'has_solar_panels'>>) =>
    request<void>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
}
