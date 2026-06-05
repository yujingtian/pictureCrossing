export interface AccessoryResponse {
  id: string
  type: string
  name: string
  image_url: string
}

export interface ModelResponse {
  id: string
  category: string
  name: string
  image_url: string
}

export interface SceneResponse {
  id: string
  category: string
  name: string
  image_url: string
}

export interface UploadResponse {
  file_id: string
  url: string
  thumbnail_url?: string
}

export interface AccessoryInput {
  source: string
  id?: string
  url?: string
}

export interface ModelInput {
  source: string
  id?: string
  url?: string
  mask_url?: string
}

export interface SceneInput {
  id: string
}

export interface GenerateOptions {
  lighting?: string
  prompt?: string
  strength?: number
  guidance_scale?: number
}

export interface CreateGenerationRequest {
  accessory_type: string
  accessory: AccessoryInput
  model: ModelInput
  scene?: SceneInput
  options?: GenerateOptions
}

export interface CreateGenerationResponse {
  task_id: string
  status: string
}

export interface TaskStatusResponse {
  task_id: string
  status: string
  progress?: number
  result_url?: string
  error?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}
