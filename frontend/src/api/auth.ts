import type { AuthResponse } from '@/types'

const BASE = '/api/auth'

async function authRequest<T>(url: string, init?: RequestInit): Promise<T> {
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

export const authApi = {
  register: (username: string, email: string, password: string) =>
    authRequest<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),

  login: (username: string, password: string) =>
    authRequest<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: (token: string) =>
    authRequest<void>('/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    authRequest<void>('/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
}
