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

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  const errorMessage = getErrorMessage(data, `HTTP ${response.status}`)

  if (!response.ok) {
    throw new Error(errorMessage)
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (record.success === false || (typeof record.error === 'string' && record.error)) {
      throw new Error(errorMessage)
    }
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
