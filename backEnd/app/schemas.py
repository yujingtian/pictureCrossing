from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


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
    source: str
    id: Optional[str] = None
    url: Optional[str] = None


class ModelInput(BaseModel):
    source: str
    id: Optional[str] = None
    url: Optional[str] = None
    mask_url: Optional[str] = None


class SceneInput(BaseModel):
    id: str


class GenerateOptions(BaseModel):
    lighting: str = "natural"
    prompt: Optional[str] = None
    strength: float = Field(default=0.75, ge=0.0, le=1.0)
    guidance_scale: float = Field(default=7.5, ge=1.0, le=30.0)


class CreateGenerationRequest(BaseModel):
    accessory_type: str
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


class ApiResponse(BaseModel):
    success: bool = True
    data: Optional[dict | list] = None
    message: Optional[str] = None
