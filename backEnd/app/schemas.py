from pydantic import BaseModel, Field, EmailStr, model_validator
from datetime import datetime
from typing import Literal, Optional, List, Any, Generic, TypeVar
import re
from app.config import get_settings


# ==================== 通用 ====================

T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class SortParams(BaseModel):
    sort_by: Optional[str] = None
    sort_order: Literal["asc", "desc"] = "desc"


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== 原有的类型 ====================

InputSource = Literal["preset", "upload", "custom"]
AccessoryType = Literal["bracelet"]
UploadType = Literal["accessory", "model", "mask"]
GenerationModel = Literal["wan2.7-image-pro", "qwen-image-2.0-pro"]


class AccessoryResponse(BaseModel):
    id: str
    type: str
    name: str
    image_url: str

    class Config:
        from_attributes = True


class ModelResponse(BaseModel):
    id: str
    category: str
    name: str
    image_url: str

    class Config:
        from_attributes = True


class SceneResponse(BaseModel):
    id: str
    category: str
    name: str
    image_url: str

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    file_id: str
    url: str
    thumbnail_url: Optional[str] = None


class AccessoryInput(BaseModel):
    source: InputSource
    id: Optional[str] = None
    url: Optional[str] = None

    @model_validator(mode="after")
    def validate_source_fields(self):
        if self.source in ("upload", "custom") and not self.url:
            raise ValueError("上传配饰必须提供 url")
        if self.source == "preset" and not (self.id or self.url):
            raise ValueError("预设配饰必须提供 id 或 url")
        return self


class ModelInput(BaseModel):
    source: InputSource
    id: Optional[str] = None
    url: Optional[str] = None
    mask_url: Optional[str] = None

    @model_validator(mode="after")
    def validate_source_fields(self):
        if self.source in ("upload", "custom") and not self.url:
            raise ValueError("上传模特必须提供 url")
        if self.source == "preset" and not (self.id or self.url):
            raise ValueError("预设模特必须提供 id 或 url")
        return self


class SceneInput(BaseModel):
    id: str


class GenerateOptions(BaseModel):
    lighting: str = "natural"
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    model: Optional[GenerationModel] = None
    strength: float = Field(default=0.75, ge=0.0, le=1.0)
    guidance_scale: float = Field(default=7.5, ge=1.0, le=30.0)


class CreateGenerationRequest(BaseModel):
    accessory_type: AccessoryType
    accessory: AccessoryInput
    model: ModelInput
    scene: Optional[SceneInput] = None
    options: Optional[GenerateOptions] = None


class CreateGenerationResponse(BaseModel):
    task_id: str
    status: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: Optional[int] = None
    result_url: Optional[str] = None
    error: Optional[str] = None


# ==================== 认证相关 ====================

def validate_password_strength(password: str) -> List[str]:
    settings = get_settings()
    errors = []

    if len(password) < settings.password_min_length:
        errors.append(f"密码长度至少 {settings.password_min_length} 位")
    if settings.password_require_uppercase and not re.search(r'[A-Z]', password):
        errors.append("密码需要包含大写字母")
    if settings.password_require_lowercase and not re.search(r'[a-z]', password):
        errors.append("密码需要包含小写字母")
    if settings.password_require_digits and not re.search(r'[0-9]', password):
        errors.append("密码需要包含数字")
    if settings.password_require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("密码需要包含特殊字符")

    return errors


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_password(self):
        errors = validate_password_strength(self.password)
        if errors:
            raise ValueError("; ".join(errors))
        return self


class UserLogin(BaseModel):
    login: str = Field(..., description="邮箱或用户名")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    quota_total: int
    quota_used: int
    is_active: bool
    email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @model_validator(mode="after")
    def validate_new_password(self):
        errors = validate_password_strength(self.new_password)
        if errors:
            raise ValueError("; ".join(errors))
        return self


class SendVerificationEmailRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @model_validator(mode="after")
    def validate_new_password(self):
        errors = validate_password_strength(self.new_password)
        if errors:
            raise ValueError("; ".join(errors))
        return self


# ==================== 用户接口 ====================

class QuotaResponse(BaseModel):
    quota_total: int
    quota_used: int
    quota_remaining: int


class TaskHistoryParams(PaginationParams, SortParams):
    status: Optional[str] = None
    accessory_type: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None


class TaskHistoryItem(BaseModel):
    id: str
    status: str
    accessory_type: str
    result_image_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== 管理接口 - 统计 ====================

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users_today: int
    total_generations: int
    generations_today: int
    quota_usage_rate: float


# ==================== 管理接口 - 用户 ====================

class UserListParams(PaginationParams, SortParams):
    search: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminUserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    quota_total: int
    quota_used: int
    is_active: bool
    email_verified: bool
    last_login_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: Literal["user", "admin"] = "user"
    quota_total: int = Field(10, ge=0)
    is_active: bool = True


class AdminUserUpdateRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[Literal["user", "admin"]] = None
    is_active: Optional[bool] = None


class AdminUserQuotaUpdateRequest(BaseModel):
    quota_total: int = Field(..., ge=0)


# ==================== 管理接口 - 推荐图 ====================

class RecommendationCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    image_url: str = Field(..., max_length=500)
    position: str = "home"
    accessory_type: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    link_type: Optional[str] = None
    link_target: Optional[str] = None


class RecommendationUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, max_length=500)
    position: Optional[str] = None
    accessory_type: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    link_type: Optional[str] = None
    link_target: Optional[str] = None


class RecommendationResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    image_url: str
    position: str
    accessory_type: Optional[str]
    sort_order: int
    is_active: bool
    link_type: Optional[str]
    link_target: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecommendationListParams(PaginationParams, SortParams):
    position: Optional[str] = None
    is_active: Optional[bool] = None
    search: Optional[str] = None
