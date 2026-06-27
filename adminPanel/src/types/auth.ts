export interface User {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  quotaTotal: number
  quotaUsed: number
  isActive: boolean
  emailVerified: boolean
  createdAt: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface LoginRequest {
  login: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface QuotaResponse {
  quotaTotal: number
  quotaUsed: number
  quotaRemaining: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface RecommendationImage {
  id: string
  title: string
  description?: string
  imageUrl: string
  position: string
  accessoryType?: string
  sortOrder: number
  isActive: boolean
  linkType?: string
  linkTarget?: string
  createdAt: string
  updatedAt: string
}
