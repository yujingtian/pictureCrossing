import {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
  QuotaResponse,
} from '@/types/auth'
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setUser,
  clearAuth,
} from '@/utils/storage'

const API_BASE = '/api'

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    const originalRequest = { url, options }

    if (!isRefreshing) {
      isRefreshing = true

      try {
        const newToken = await refreshTokens()
        onTokenRefreshed(newToken)

        const retryHeaders = new Headers(options.headers || {})
        retryHeaders.set('Authorization', `Bearer ${newToken}`)

        return fetch(url, { ...options, headers: retryHeaders })
      } catch (err) {
        clearAuth()
        window.location.href = '/login'
        throw err
      } finally {
        isRefreshing = false
      }
    } else {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          const retryHeaders = new Headers(options.headers || {})
          retryHeaders.set('Authorization', `Bearer ${newToken}`)
          resolve(fetch(url, { ...options, headers: retryHeaders }))
        })
      })
    }
  }

  return response
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`)
  }

  return data
}

export async function login(credentials: LoginRequest): Promise<ApiResponse<TokenResponse>> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const data = await handleResponse<ApiResponse<TokenResponse>>(response)

  if (data.success && data.data) {
    setAccessToken(data.data.access_token)
    setRefreshToken(data.data.refresh_token)
  }

  return data
}

export async function register(data: RegisterRequest): Promise<ApiResponse<TokenResponse>> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  return handleResponse<ApiResponse<TokenResponse>>(response)
}

export async function refreshTokens(): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  const data = await handleResponse<ApiResponse<TokenResponse>>(response)

  if (!data.success || !data.data) {
    throw new Error('Failed to refresh token')
  }

  setAccessToken(data.data.access_token)
  setRefreshToken(data.data.refresh_token)

  return data.data.access_token
}

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  const response = await fetchWithAuth(`${API_BASE}/auth/me`)
  const data = await handleResponse<ApiResponse<User>>(response)

  if (data.success && data.data) {
    setUser(data.data)
  }

  return data
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Ignore errors during logout
    }
  }
  clearAuth()
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
  const response = await fetchWithAuth(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })

  return handleResponse<ApiResponse>(response)
}

export async function forgotPassword(email: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  return handleResponse<ApiResponse>(response)
}

export async function resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  })

  return handleResponse<ApiResponse>(response)
}

export async function getQuota(): Promise<ApiResponse<QuotaResponse>> {
  const response = await fetchWithAuth(`${API_BASE}/users/quota`)
  return handleResponse<ApiResponse<QuotaResponse>>(response)
}

export async function getRecommendations(position: string = 'home'): Promise<ApiResponse<any[]>> {
  const params = new URLSearchParams({ position })
  const response = await fetch(`${API_BASE}/presets/recommendations?${params}`)
  return handleResponse<ApiResponse<any[]>>(response)
}
