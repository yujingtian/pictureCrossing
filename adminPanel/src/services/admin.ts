import { getAccessToken, removeAccessToken, clearAuth } from '@/utils/storage'

const API_BASE = '/api/admin'

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (!options.method) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('未授权')
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || '请求失败')
  }

  return data
}

// 统计
export async function getStats(): Promise<any> {
  return request('/stats')
}

// 用户管理
export async function getUsers(params?: {
  page?: number
  pageSize?: number
  search?: string
}): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString())
  if (params?.search) searchParams.set('search', params.search)

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return request(`/users${query}`)
}

export async function getUser(id: string): Promise<any> {
  return request(`/users/${id}`)
}

export async function createUser(data: {
  username: string
  email: string
  password: string
  role: 'user' | 'admin'
  quotaTotal: number
}): Promise<any> {
  return request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateUser(id: string, data: {
  username?: string
  email?: string
  role?: 'user' | 'admin'
  isActive?: boolean
}): Promise<any> {
  return request(`/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateUserQuota(id: string, quotaTotal: number): Promise<any> {
  return request(`/users/${id}/quota`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quotaTotal }),
  })
}

// 推荐图管理
export async function getRecommendations(params?: {
  page?: number
  pageSize?: number
  position?: string
  search?: string
}): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString())
  if (params?.position) searchParams.set('position', params.position)
  if (params?.search) searchParams.set('search', params.search)

  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return request(`/recommendations${query}`)
}

export async function getRecommendation(id: string): Promise<any> {
  return request(`/recommendations/${id}`)
}

export async function createRecommendation(data: {
  title: string
  description?: string
  imageUrl: string
  position: string
  accessoryType?: string
  sortOrder: number
  isActive: boolean
  linkType?: string
  linkTarget?: string
}): Promise<any> {
  return request('/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateRecommendation(id: string, data: {
  title?: string
  description?: string
  imageUrl?: string
  position?: string
  accessoryType?: string
  sortOrder?: number
  isActive?: boolean
  linkType?: string
  linkTarget?: string
}): Promise<any> {
  return request(`/recommendations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteRecommendation(id: string): Promise<void> {
  return request(`/recommendations/${id}`, {
    method: 'DELETE',
  })
}

export async function moveRecommendationUp(id: string): Promise<any> {
  return request(`/recommendations/${id}/move-up`, {
    method: 'POST',
  })
}

export async function moveRecommendationDown(id: string): Promise<any> {
  return request(`/recommendations/${id}/move-down`, {
    method: 'POST',
  })
}
