import { getAccessToken, removeAccessToken, clearAuth } from '@/utils/storage'

const API_BASE = '/api/admin'
const API_UPLOAD = '/api/upload'

// ==================== 类型转换工具函数 ====================

/**
 * 将对象的键从 snake_case 转换为 camelCase
 */
function snakeToCamel<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel) as T
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      acc[camelKey as keyof T] = snakeToCamel(obj[key])
      return acc
    }, {} as T)
  }
  return obj
}

/**
 * 将对象的键从 camelCase 转换为 snake_case
 */
function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake)
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, (_, c) => '_' + c.toLowerCase())
      acc[snakeKey] = camelToSnake(obj[key])
      return acc
    }, {} as any)
  }
  return obj
}

// ==================== API 请求基础函数 ====================

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

  // 自动将响应数据转换为 camelCase
  return snakeToCamel(data)
}

// ==================== API 接口 ====================

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
  const backendData = camelToSnake(data)
  return request('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendData),
  })
}

export async function updateUser(id: string, data: {
  username?: string
  email?: string
  role?: 'user' | 'admin'
  isActive?: boolean
}): Promise<any> {
  const backendData = camelToSnake(data)
  return request(`/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendData),
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
  targetType?: string
  targetValue?: string
  search?: string
}): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', params.page.toString())
  if (params?.pageSize) searchParams.set('page_size', params.pageSize.toString())
  if (params?.targetType) searchParams.set('target_type', params.targetType)
  if (params?.targetValue) searchParams.set('target_value', params.targetValue)
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
  targetType: string
  targetValue: string
  sortOrder: number
  isActive: boolean
}): Promise<any> {
  const backendData = camelToSnake(data)
  return request('/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendData),
  })
}

export async function updateRecommendation(id: string, data: {
  title?: string
  description?: string
  imageUrl?: string
  targetType?: string
  targetValue?: string
  sortOrder?: number
  isActive?: boolean
}): Promise<any> {
  const backendData = camelToSnake(data)
  return request(`/recommendations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendData),
  })
}

export async function deleteRecommendation(id: string): Promise<void> {
  return request(`/recommendations/${id}`, {
    method: 'DELETE',
  })
}

// 图片上传
export async function uploadImage(file: File, type: 'accessory' | 'model' | 'mask' = 'model'): Promise<any> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_UPLOAD}?type=${type}`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  })

  if (response.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('未授权')
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || '上传失败')
  }

  // 自动将响应数据转换为 camelCase
  return snakeToCamel(data)
}
