import type {
  AccessoryResponse,
  ModelResponse,
  SceneResponse,
  UploadResponse,
  CreateGenerationRequest,
  CreateGenerationResponse,
  TaskStatusResponse,
  ApiResponse,
  UploadType,
} from '@/types/api'
import { getAccessToken, getRefreshToken, setAccessToken, clearAuth } from '@/utils/storage'

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token))
  refreshSubscribers = []
}

function getErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback

  const record = data as Record<string, unknown>
  const error = record.error
  const message = record.message
  const detail = record.detail

  if (typeof error === 'string' && error) return error
  if (typeof message === 'string' && message) return message
  if (typeof detail === 'string' && detail) return detail

  return fallback
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  const text = await response.text()
  return text || null
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await parseResponseBody(response)
  const fallback = typeof data === 'string' && data ? data : `HTTP ${response.status}`
  const errorMessage = getErrorMessage(data, fallback)

  if (!response.ok) {
    throw new Error(errorMessage)
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (record.success === false || (typeof record.error === 'string' && record.error)) {
      throw new Error(errorMessage)
    }
  }

  return data as T
}

async function fetchWithAuth(url: string, options: RequestInit = {}, requireAuth: boolean = false): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401 && requireAuth) {
    const originalRequest = { url, options }

    if (!isRefreshing) {
      isRefreshing = true

      try {
        const newToken = await doRefreshToken()
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

async function doRefreshToken(): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  })

  const data = await handleResponse<ApiResponse<any>>(response)

  if (!data.success || !data.data) {
    throw new Error('Failed to refresh token')
  }

  setAccessToken(data.data.access_token)

  return data.data.access_token
}

export async function getPresetAccessories(type?: string): Promise<ApiResponse<AccessoryResponse[]>> {
  const url = new URL('/api/presets/accessories', window.location.origin)
  if (type) {
    url.searchParams.set('type', type)
  }
  const response = await fetch(url.toString())
  return handleResponse<ApiResponse<AccessoryResponse[]>>(response)
}

export async function getPresetModels(category?: string): Promise<ApiResponse<ModelResponse[]>> {
  const url = new URL('/api/presets/models', window.location.origin)
  if (category && category !== 'all') {
    url.searchParams.set('category', category)
  }
  const response = await fetch(url.toString())
  return handleResponse<ApiResponse<ModelResponse[]>>(response)
}

export async function getPresetScenes(category?: string): Promise<ApiResponse<SceneResponse[]>> {
  const url = new URL('/api/presets/scenes', window.location.origin)
  if (category) {
    url.searchParams.set('category', category)
  }
  const response = await fetch(url.toString())
  return handleResponse<ApiResponse<SceneResponse[]>>(response)
}

export async function uploadImage(file: File, type: UploadType): Promise<ApiResponse<UploadResponse>> {
  const formData = new FormData()
  formData.append('file', file)

  const url = new URL('/api/upload', window.location.origin)
  url.searchParams.set('type', type)

  const response = await fetchWithAuth(url.toString(), {
    method: 'POST',
    body: formData,
  }, true)
  return handleResponse<ApiResponse<UploadResponse>>(response)
}

export async function createGeneration(
  request: CreateGenerationRequest
): Promise<ApiResponse<CreateGenerationResponse>> {
  const response = await fetchWithAuth('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  }, true)
  return handleResponse<ApiResponse<CreateGenerationResponse>>(response)
}

export async function getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
  const response = await fetchWithAuth(`/api/generate/${taskId}`, {}, true)
  return handleResponse<ApiResponse<TaskStatusResponse>>(response)
}
