export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  quota_total: number;
  quota_used: number;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface QuotaResponse {
  quota_total: number;
  quota_used: number;
  quota_remaining: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RecommendationImage {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  position: string;
  accessory_type?: string;
  sort_order: number;
  is_active: boolean;
  link_type?: string;
  link_target?: string;
  created_at: string;
  updated_at: string;
}
