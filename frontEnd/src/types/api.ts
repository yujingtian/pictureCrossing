export type InputSource = 'preset' | 'upload'
export type UploadType = 'accessory' | 'model' | 'mask'
export type AccessoryType = 'bracelet'
export type GenerationTaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'not_found'

export interface AccessoryResponse {
  id: string
  type: string
  name: string
  imageUrl: string
}

export interface ModelResponse {
  id: string
  category: string
  name: string
  imageUrl: string
}

export interface SceneResponse {
  id: string
  category: string
  name: string
  imageUrl: string
}

export interface UploadResponse {
  fileId: string
  url: string
  thumbnailUrl?: string | null
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
  maskUrl?: string
}

export interface SceneInput {
  id: string
}

export interface GenerateOptions {
  lighting?: string
  prompt?: string
  strength?: number
  guidanceScale?: number
}

export interface CreateGenerationRequest {
  accessoryType: AccessoryType
  accessory: AccessoryInput
  model: ModelInput
  scene?: SceneInput
  options?: GenerateOptions
}

export interface CreateGenerationResponse {
  taskId: string
  status: Extract<GenerationTaskStatus, 'pending'>
}

export interface TaskStatusResponse {
  taskId: string
  status: GenerationTaskStatus
  progress?: number
  resultUrl?: string | null
  error?: string | null
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
