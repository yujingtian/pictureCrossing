import {
  RecommendationImage,
  UploadResponse,
  CreateGenerationRequest,
  CreateGenerationResponse,
  TaskStatusResponse,
  ApiResponse
} from '@/types/api'
import { getAccessToken } from '@/utils/storage'

const API_BASE = '/api'

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

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(url, { ...options, headers })
  return response
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`)
  }

  // 自动将响应数据转换为 camelCase
  return snakeToCamel(data)
}

// ==================== API 接口 ====================

// 获取配饰推荐列表
export async function getAccessories(accessoryType: string = 'bracelet'): Promise<ApiResponse<RecommendationImage[]>> {
  const params = new URLSearchParams()
  params.set('target_type', 'accessory')
  params.set('target_value', accessoryType)
  const response = await fetch(`${API_BASE}/presets/recommendations?${params.toString()}`)
  return handleResponse<ApiResponse<RecommendationImage[]>>(response)
}

// 获取模特推荐列表
export async function getModels(modelCategory: string = 'wrist'): Promise<ApiResponse<RecommendationImage[]>> {
  const params = new URLSearchParams()
  params.set('target_type', 'model')
  params.set('target_value', modelCategory)
  const response = await fetch(`${API_BASE}/presets/recommendations?${params.toString()}`)
  return handleResponse<ApiResponse<RecommendationImage[]>>(response)
}

// 获取推荐图列表
export async function getRecommendations(targetType?: string, targetValue?: string): Promise<ApiResponse<RecommendationImage[]>> {
  const params = new URLSearchParams()
  if (targetType) params.set('target_type', targetType)
  if (targetValue) params.set('target_value', targetValue)
  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(`${API_BASE}/presets/recommendations${query}`)
  return handleResponse<ApiResponse<RecommendationImage[]>>(response)
}

// 上传文件
export async function uploadImage(file: File, type: string): Promise<ApiResponse<UploadResponse>> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const response = await fetchWithAuth(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  })

  return handleResponse<ApiResponse<UploadResponse>>(response)
}

// 创建生成任务
export async function createGeneration(request: CreateGenerationRequest): Promise<ApiResponse<CreateGenerationResponse>> {
  // 转换为后端期望的 snake_case
  const backendRequest = camelToSnake(request)

  const response = await fetchWithAuth(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendRequest)
  })

  return handleResponse<ApiResponse<CreateGenerationResponse>>(response)
}

// 获取任务状态
export async function getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
  const response = await fetchWithAuth(`${API_BASE}/generate/${taskId}`)
  return handleResponse<ApiResponse<TaskStatusResponse>>(response)
}
