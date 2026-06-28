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

  return data
}

// 获取配饰推荐列表
export async function getAccessories(): Promise<ApiResponse<RecommendationImage[]>> {
  const response = await fetch(`${API_BASE}/presets/accessories`)
  return handleResponse<ApiResponse<RecommendationImage[]>>(response)
}

// 获取模特推荐列表
export async function getModels(): Promise<ApiResponse<RecommendationImage[]>> {
  const response = await fetch(`${API_BASE}/presets/models`)
  return handleResponse<ApiResponse<RecommendationImage[]>>(response)
}

// 获取推荐图列表
export async function getRecommendations(type?: string): Promise<ApiResponse<RecommendationImage[]>> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
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
  // 转换为后端期望的蛇形命名
  const backendRequest = {
    accessory_type: request.accessoryType,
    accessory: request.accessory,
    model: request.model.maskUrl ? { ...request.model, mask_url: request.model.maskUrl } : request.model,
    scene: request.scene,
    options: request.options ? {
      lighting: request.options.lighting,
      prompt: request.options.prompt,
      negative_prompt: (request.options as any).negativePrompt,
      strength: request.options.strength,
      guidance_scale: request.options.guidanceScale
    } : undefined
  }

  const response = await fetchWithAuth(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendRequest)
  })

  const data = await handleResponse<ApiResponse<any>>(response)

  // 转换回驼峰命名
  if (data.success && data.data) {
    return {
      ...data,
      data: {
        taskId: data.data.task_id,
        status: data.data.status
      }
    }
  }

  return data as ApiResponse<CreateGenerationResponse>
}

// 获取任务状态
export async function getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
  const response = await fetchWithAuth(`${API_BASE}/generate/${taskId}`)
  const data = await handleResponse<ApiResponse<any>>(response)

  // 转换为驼峰命名
  if (data.success && data.data) {
    return {
      ...data,
      data: {
        taskId: data.data.task_id,
        status: data.data.status,
        progress: data.data.progress,
        resultUrl: data.data.result_url,
        error: data.data.error
      }
    }
  }

  return data as ApiResponse<TaskStatusResponse>
}
