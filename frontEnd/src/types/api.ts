export type InputSource = 'preset' | 'upload'
export type UploadType = 'accessory' | 'model' | 'mask'
export type AccessoryType = 'bracelet'
export type GenerationTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'not_found'

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
  thumbnail_url?: string | null
}

export interface PresetAssetInput {
  source: 'preset'
  id: string
  url: string
}

export interface UploadAssetInput {
  source: 'upload'
  id?: string
  url: string
}

export type AccessoryInput = PresetAssetInput | UploadAssetInput

export type ModelInput = (PresetAssetInput | UploadAssetInput) & {
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
  accessory_type: AccessoryType
  accessory: AccessoryInput
  model: ModelInput
  scene?: SceneInput
  options?: GenerateOptions
}

export interface CreateGenerationResponse {
  task_id: string
  status: Extract<GenerationTaskStatus, 'pending'>
}

export interface TaskStatusResponse {
  task_id: string
  status: GenerationTaskStatus
  progress?: number
  result_url?: string | null
  error?: string | null
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
