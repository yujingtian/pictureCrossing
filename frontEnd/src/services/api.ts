import type {
  AccessoryResponse,
  ModelResponse,
  SceneResponse,
  UploadResponse,
  CreateGenerationRequest,
  CreateGenerationResponse,
  TaskStatusResponse,
  ApiResponse,
} from '@/types/api'

const API_BASE = ''

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`)
  }
  return data
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

export async function uploadImage(file: File, type: string): Promise<ApiResponse<UploadResponse>> {
  const formData = new FormData()
  formData.append('file', file)

  const url = new URL('/api/upload', window.location.origin)
  url.searchParams.set('type', type)

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData,
  })
  return handleResponse<ApiResponse<UploadResponse>>(response)
}

export async function createGeneration(
  request: CreateGenerationRequest
): Promise<ApiResponse<CreateGenerationResponse>> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  return handleResponse<ApiResponse<CreateGenerationResponse>>(response)
}

export async function getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
  const response = await fetch(`/api/generate/${taskId}`)
  return handleResponse<ApiResponse<TaskStatusResponse>>(response)
}
