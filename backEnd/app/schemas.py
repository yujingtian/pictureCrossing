from pydantic import BaseModel, Field, model_validator
from datetime import datetime
from typing import Literal, Optional, List


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


class ApiResponse(BaseModel):
    success: bool = True
    data: Optional[dict | list] = None
    message: Optional[str] = None
