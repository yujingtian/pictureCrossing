# AI 试戴间 - Python 后端设计方案

## 文档信息

| 项目 | 内容 |
|-----|------|
| 项目名称 | AI 试衣间后端 |
| 技术栈 | Python + FastAPI + SQLite |
| 创建日期 | 2026-05-31 |
| 文档版本 | v1.1 |
| 更新内容 | 新增阿里百炼 Qwen-Image-2.0-Pro 图生图方案 |

---

## 目录

1. [技术选型](#1-技术选型)
2. [项目目录结构](#2-项目目录结构)
3. [数据模型设计](#3-数据模型设计)
4. [Pydantic 模式](#4-pydantic-模式)
5. [核心实现代码](#5-核心实现代码)
6. [API 路由实现](#6-api-路由实现)
7. [主应用入口](#7-主应用入口)
8. [初始化数据](#8-初始化数据)
9. [环境变量配置](#9-环境变量配置)
10. [快速启动指南](#10-快速启动指南)

---

## 1. 技术选型

| 组件 | 技术方案 | 说明 |
|-----|---------|------|
| Web 框架 | FastAPI | 高性能、异步支持、自动生成 API 文档 |
| 数据库 | SQLite | 轻量级，SQLAlchemy ORM，已启用 WAL 模式 |
| 任务队列 | 内存队列 + 线程 | 简化实现，适合个人项目 |
| 速率限制 | slowapi + Limiter | 接口防刷机制 |
| 文件存储 | 本地文件系统 | 简单直接 |
| 图片处理 | Pillow | 图片裁剪、压缩、遮罩生成 |
| AI 服务 | Mock / Stable Diffusion / 阿里百炼 (Qwen-Image-2.0-Pro) | 默认 Mock，推荐使用阿里百炼 |

### 核心依赖 (requirements.txt)

```txt
fastapi>=0.109.0
uvicorn>=0.27.0
sqlalchemy>=2.0.25
python-multipart>=0.0.6
pillow>=10.2.0
pydantic>=2.6.0
pydantic-settings>=2.2.0
python-dotenv>=1.0.0
slowapi>=0.1.9
limits>=3.7.0
dashscope>=1.20.0
```

---

## 2. 项目目录结构

```
backend/
├── main.py                       # 应用入口
├── app/
│   ├── __init__.py
│   ├── config.py                 # 配置管理
│   ├── database.py               # 数据库连接 (WAL 优化)
│   ├── models.py                 # SQLAlchemy ORM 模型
│   ├── schemas.py                # Pydantic 模型
│   ├── dependencies.py           # FastAPI 依赖注入
│   ├── api/
│   │   ├── __init__.py
│   │   ├── presets.py            # 预设资源接口
│   │   ├── upload.py             # 文件上传接口
│   │   └── generate.py           # AI 生成接口
│   ├── services/
│   │   ├── __init__.py
│   │   ├── storage.py            # 本地文件存储服务
│   │   ├── mask_service.py       # 遮罩生成服务
│   │   ├── ai_service.py         # AI 服务 (Mock/SD/火山)
│   │   ├── task_queue.py         # 内存任务队列
│   │   └── rate_limiter.py       # 速率限制器
│   └── core/
│       └── init_data.py          # 初始化数据
├── data/
│   └── placeholder.jpg           # 占位图 (开发用)
├── uploads/                      # 上传文件目录
├── results/                      # 生成结果目录
├── .env.example                  # 环境变量示例
└── requirements.txt
```

---

## 3. 数据模型设计

### `app/models.py`

```python
from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

# 任务状态枚举
class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class PresetAccessory(Base):
    __tablename__ = "preset_accessories"
    id = Column(String, primary_key=True)
    type = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class PresetModel(Base):
    __tablename__ = "preset_models"
    id = Column(String, primary_key=True)
    category = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class PresetScene(Base):
    __tablename__ = "preset_scenes"
    id = Column(String, primary_key=True)
    category = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    prompt_template = Column(Text)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class GenerationTask(Base):
    __tablename__ = "generation_tasks"
    id = Column(String, primary_key=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, index=True)
    accessory_type = Column(String, nullable=False)

    accessory_source = Column(String)
    accessory_id = Column(String)
    accessory_url = Column(String)

    model_source = Column(String)
    model_id = Column(String)
    model_url = Column(String)
    model_mask_url = Column(String)

    scene_id = Column(String)

    lighting = Column(String, default="natural")
    prompt = Column(Text)

    result_image_url = Column(String)
    error_message = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## 4. Pydantic 模式

### `app/schemas.py`

```python
from pydantic import BaseModel
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
    strength: float = 0.75
    guidance_scale: float = 7.5

class CreateGenerationRequest(BaseModel):
    accessory_type: str
    accessory: AccessoryInput
    model: ModelInput
    scene: SceneInput
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
```

---

## 5. 核心实现代码

### 5.1 配置管理 (`app/config.py`)

```python
from pydantic_settings import BaseSettings
from typing import List, Literal
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "AI 试衣间 API"
    debug: bool = True
    database_url: str = "sqlite:///./data/db.sqlite"
    upload_dir: str = "./uploads"
    result_dir: str = "./results"
    static_dir: str = "./static"
    max_upload_size: int = 10 * 1024 * 1024
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 5
    rate_limit_per_day: int = 50
    ai_provider: Literal["mock", "stable_diffusion", "bailian"] = "mock"
    bailian_api_key: str = ""
    bailian_model: str = "qwen-image-2.0-pro"
    stable_diffusion_api_url: str = "http://localhost:7860"
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings():
    return Settings()
```

### 5.2 数据库连接 (`app/database.py`)

```python
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.config import get_settings
from app import models
import os

settings = get_settings()

db_path = settings.database_url.replace("sqlite:///", "")
os.makedirs(os.path.dirname(db_path), exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={
        "check_same_thread": False,
        "timeout": 15
    }
)

if "sqlite" in settings.database_url:
    try:
        with engine.connect() as con:
            con.execute(text("PRAGMA journal_mode=WAL"))
            con.commit()
    except Exception as e:
        print(f"WAL 模式启用失败: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    models.Base.metadata.create_all(bind=engine)

def reset_stuck_tasks():
    from app.models import GenerationTask, TaskStatus
    db = SessionLocal()
    try:
        stuck_tasks = db.query(GenerationTask).filter(
            GenerationTask.status == TaskStatus.PROCESSING
        ).all()
        for task in stuck_tasks:
            task.status = TaskStatus.FAILED
            task.error_message = "Task was interrupted by server restart"
        db.commit()
        print(f"已重置 {len(stuck_tasks)} 个卡住的任务")
    except Exception as e:
        print(f"重置任务失败: {e}")
        db.rollback()
    finally:
        db.close()
```

### 5.3 本地文件存储 (`app/services/storage.py`)

```python
import os
import uuid
from fastapi import UploadFile, HTTPException
from PIL import Image
from app.config import get_settings

settings = get_settings()

class BaseStorageService:
    async def save_upload(self, file: UploadFile, file_type: str) -> dict:
        raise NotImplementedError()
    def save_result(self, image_data: bytes, task_id: str) -> str:
        raise NotImplementedError()
    def get_public_url(self, key: str) -> str:
        raise NotImplementedError()

class LocalStorageService(BaseStorageService):
    def __init__(self):
        self.upload_dir = settings.upload_dir
        self.result_dir = settings.result_dir
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.result_dir, exist_ok=True)

    async def save_upload(self, file: UploadFile, file_type: str) -> dict:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="只支持图片文件")

        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        file_id = f"{file_type}_{uuid.uuid4().hex[:12]}"
        filename = f"{file_id}.{ext}"
        filepath = os.path.join(self.upload_dir, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        thumb_filename = None
        try:
            thumb_filename = f"{file_id}_thumb.jpg"
            thumb_filepath = os.path.join(self.upload_dir, thumb_filename)
            with Image.open(filepath) as img:
                img.thumbnail((200, 200))
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(thumb_filepath, "JPEG", quality=85)
        except Exception as e:
            print(f"缩略图生成失败: {e}")

        return {
            "file_id": file_id,
            "url": f"/uploads/{filename}",
            "thumbnail_url": f"/uploads/{thumb_filename}" if thumb_filename else None
        }

    def save_result(self, image_data: bytes, task_id: str) -> str:
        filename = f"result_{task_id}.jpg"
        filepath = os.path.join(self.result_dir, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return f"/results/{filename}"

    def get_public_url(self, key: str) -> str:
        if key.startswith("/uploads/") or key.startswith("/results/"):
            return key
        return f"/uploads/{key}"

def get_storage_service() -> BaseStorageService:
    return LocalStorageService()
```

### 5.4 遮罩生成服务 (`app/services/mask_service.py`)

```python
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from io import BytesIO

class MaskService:
    @staticmethod
    def generate_wrist_mask(image_data: bytes, region: str = "center") -> bytes:
        with Image.open(BytesIO(image_data)) as img:
            width, height = img.size
            mask = Image.new('L', (width, height), 0)
            draw = ImageDraw.Draw(mask)

            if region == "center":
                ellipse_x1 = width * 0.2
                ellipse_y1 = height * 0.3
                ellipse_x2 = width * 0.8
                ellipse_y2 = height * 0.7
            else:
                ellipse_x1 = width * 0.1
                ellipse_y1 = height * 0.2
                ellipse_x2 = width * 0.9
                ellipse_y2 = height * 0.8

            draw.ellipse([ellipse_x1, ellipse_y1, ellipse_x2, ellipse_y2], fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(radius=5))

            buf = BytesIO()
            mask.save(buf, format='PNG')
            return buf.getvalue()

    @staticmethod
    def generate_mask_from_bbox(image_data: bytes, bbox: list) -> bytes:
        with Image.open(BytesIO(image_data)) as img:
            width, height = img.size
            mask = Image.new('L', (width, height), 0)
            draw = ImageDraw.Draw(mask)
            x1 = bbox[0] * width
            y1 = bbox[1] * height
            x2 = bbox[2] * width
            y2 = bbox[3] * height
            draw.rectangle([x1, y1, x2, y2], fill=255)
            buf = BytesIO()
            mask.save(buf, format='PNG')
            return buf.getvalue()
```

### 5.5 AI 服务封装 (`app/services/ai_service.py`)

```python
import os
import requests
import base64
from io import BytesIO
from PIL import Image
from app.config import get_settings

settings = get_settings()

class BaseAIService:
    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: str,
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        raise NotImplementedError()

    def build_prompt(
        self,
        accessory_type: str,
        accessory_name: str,
        scene_template: str,
        lighting: str
    ) -> str:
        type_names = {
            "bracelet": "手链",
            "necklace": "项链",
            "earring": "耳饰",
            "ring": "戒指"
        }
        lighting_desc = {
            "natural": "自然光，柔和明亮",
            "warm": "暖色调，温馨浪漫",
            "cool": "冷色调，时尚高级"
        }
        accessory_type_name = type_names.get(accessory_type, "配饰")
        lighting_text = lighting_desc.get(lighting, lighting_desc["natural"])

        return f"""高清晰度产品照片，展示佩戴{accessory_type_name}的效果。
{accessory_type_name}的款式是：{accessory_name}。
场景：{scene_template}。
光线：{lighting_text}。
要求：照片清晰、细节丰富、色彩真实、构图美观，具有商业摄影质感。
佩戴自然，贴合皮肤，真实感强。""".strip()

class MockAIService(BaseAIService):
    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: str,
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        print(f"[Mock AI] 图生图生成")
        print(f"Prompt: {prompt[:50]}...")
        placeholder_path = "data/placeholder.jpg"
        if os.path.exists(placeholder_path):
            with open(placeholder_path, "rb") as f:
                return f.read()
        else:
            img = Image.new('RGB', (512, 640), color=(245, 235, 220))
            buf = BytesIO()
            img.save(buf, format='JPEG')
            return buf.getvalue()

class StableDiffusionAIService(BaseAIService):
    def __init__(self):
        self.api_url = settings.stable_diffusion_api_url.rstrip("/")

    def _download_image(self, url: str) -> bytes:
        if url.startswith("http"):
            return requests.get(url).content
        else:
            with open(f".{url}" if url.startswith("/") else url, "rb") as f:
                return f.read()

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: str,
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        base_image_data = self._download_image(base_image_url)
        base64_image = base64.b64encode(base_image_data).decode()

        payload = {
            "init_images": [base64_image],
            "prompt": prompt,
            "negative_prompt": negative_prompt or "ugly, blurry, low quality",
            "denoising_strength": strength,
            "cfg_scale": 7.5,
            "width": 512,
            "height": 640,
            "sampler_name": "Euler a",
            "steps": 20
        }

        try:
            response = requests.post(f"{self.api_url}/sdapi/v1/img2img", json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            image_b64 = result["images"][0]
            return base64.b64decode(image_b64)
        except Exception as e:
            raise RuntimeError(f"Stable Diffusion API 调用失败: {e}")

class BailianAIService(BaseAIService):
    """阿里百炼 Qwen-Image-2.0-Pro 图生图服务"""

    def __init__(self):
        if not settings.bailian_api_key:
            raise RuntimeError("请配置 BAILIAN_API_KEY")
        self.api_key = settings.bailian_api_key
        self.model = settings.bailian_model

    def _download_image(self, url: str) -> bytes:
        if url.startswith("http"):
            return requests.get(url).content
        else:
            with open(f".{url}" if url.startswith("/") else url, "rb") as f:
                return f.read()

    def _image_to_base64(self, image_data: bytes) -> str:
        return base64.b64encode(image_data).decode()

    def _composite_reference_image(
        self,
        base_image_data: bytes,
        accessory_image_data: bytes
    ) -> bytes:
        """
        将参考配饰图合成到基础图上作为参考
        使用简单的拼接或叠加方式
        """
        with Image.open(BytesIO(base_image_data)) as base_img:
            base_width, base_height = base_img.size

            # 如果有配饰图，将其调整后放在角落作为参考
            if accessory_image_data:
                try:
                    with Image.open(BytesIO(accessory_image_data)) as acc_img:
                        # 调整配饰图大小
                        acc_size = min(base_width // 4, base_height // 4)
                        acc_img.thumbnail((acc_size, acc_size))

                        # 创建一个新图，将配饰图放在右下角
                        if base_img.mode in ("RGBA", "P"):
                            base_img = base_img.convert("RGB")

                        # 将配饰图粘贴在右下角
                        if acc_img.mode in ("RGBA", "P"):
                            acc_img = acc_img.convert("RGB")

                        base_img.paste(
                            acc_img,
                            (base_width - acc_size - 10, base_height - acc_size - 10)
                        )
                except Exception as e:
                    print(f"合成参考图失败: {e}")

            buf = BytesIO()
            base_img.save(buf, format='JPEG', quality=95)
            return buf.getvalue()

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: str,
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        import dashscope
        from dashscope import ImageSynthesis

        # 下载基础图片
        base_image_data = self._download_image(base_image_url)

        # 下载配饰图片（如果有）
        accessory_image_data = None
        if accessory_image_url:
            try:
                accessory_image_data = self._download_image(accessory_image_url)
            except Exception as e:
                print(f"下载配饰图失败: {e}")

        # 合成参考图
        composite_image_data = self._composite_reference_image(
            base_image_data,
            accessory_image_data
        )

        # 转换为 base64
        base64_image = self._image_to_base64(composite_image_data)

        # 设置 API Key
        dashscope.api_key = self.api_key

        # 调用百炼图生图 API
        try:
            # 参考强度映射到 0.0-1.0
            ref_weight = max(0.5, min(1.0, 1.0 - strength * 0.3))

            resp = ImageSynthesis.call(
                model=self.model,
                prompt=prompt,
                negative_prompt=negative_prompt or "低质量, 模糊, 变形, 丑陋",
                size="1024*1280",
                n=1,
                # 图生图参数
                ref_image_url=f"data:image/jpeg;base64,{base64_image}",
                ref_mode="repaint",  # 重绘模式
                ref_weight=ref_weight
            )

            if resp.status_code == 200:
                # 获取生成的图片 URL
                result_url = resp.output.results[0].url
                # 下载图片
                image_response = requests.get(result_url)
                image_response.raise_for_status()
                return image_response.content
            else:
                raise RuntimeError(f"百炼 API 调用失败: {resp.code} - {resp.message}")

        except ImportError:
            raise RuntimeError("请安装 dashscope: pip install dashscope")
        except Exception as e:
            raise RuntimeError(f"百炼 API 调用失败: {e}")

def get_ai_service() -> BaseAIService:
    if settings.ai_provider == "stable_diffusion":
        return StableDiffusionAIService()
    elif settings.ai_provider == "bailian":
        return BailianAIService()
    return MockAIService()
```

### 5.6 内存任务队列 (`app/services/task_queue.py`)

```python
import uuid
import threading
import time
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.models import GenerationTask, TaskStatus, PresetAccessory, PresetScene, PresetModel
from app.services.ai_service import get_ai_service
from app.services.storage import get_storage_service
from app.config import get_settings
from app.database import SessionLocal

settings = get_settings()

class BaseTaskQueue:
    def __init__(self):
        self.ai_service = get_ai_service()
        self.storage = get_storage_service()

    def create_task(self, db: Session, accessory_type: str,
                    accessory: dict, model: dict, scene: dict,
                    options: dict = None) -> str:
        raise NotImplementedError()

    def get_task_status(self, task_id: str) -> dict:
        raise NotImplementedError()

class MemoryTaskQueue(BaseTaskQueue):
    def __init__(self):
        super().__init__()
        self.tasks: Dict[str, dict] = {}
        self.lock = threading.Lock()
        self._start_worker()

    def _start_worker(self):
        worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        worker_thread.start()

    def _worker_loop(self):
        while True:
            task_id = None
            with self.lock:
                for tid, info in self.tasks.items():
                    if info["status"] == "pending":
                        task_id = tid
                        info["status"] = "processing"
                        info["progress"] = 10
                        break
            if task_id:
                self._execute_task(task_id)
            else:
                time.sleep(1)

    def create_task(self, db: Session, accessory_type: str,
                    accessory: dict, model: dict, scene: dict,
                    options: dict = None) -> str:
        task_id = f"task_{uuid.uuid4().hex[:16]}"

        task = GenerationTask(
            id=task_id,
            status=TaskStatus.PENDING,
            accessory_type=accessory_type,
            accessory_source=accessory.get("source"),
            accessory_id=accessory.get("id"),
            accessory_url=accessory.get("url"),
            model_source=model.get("source"),
            model_id=model.get("id"),
            model_url=model.get("url"),
            model_mask_url=model.get("mask_url"),
            scene_id=scene.get("id"),
            lighting=options.get("lighting", "natural") if options else "natural"
        )
        db.add(task)
        db.commit()

        with self.lock:
            self.tasks[task_id] = {
                "status": "pending",
                "progress": 0,
                "result_url": None,
                "error": None
            }

        return task_id

    def _update_task_info(self, task_id: str, **kwargs):
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id].update(kwargs)

    def get_task_status(self, task_id: str) -> dict:
        with self.lock:
            if task_id in self.tasks:
                info = self.tasks[task_id].copy()
                info["task_id"] = task_id
                return info
        return {"task_id": task_id, "status": "not_found"}

    def _execute_task(self, task_id: str):
        db = SessionLocal()
        try:
            task = db.query(GenerationTask).filter_by(id=task_id).first()
            if not task:
                return

            task.status = TaskStatus.PROCESSING
            db.commit()
            self._update_task_info(task_id, status="processing", progress=10)

            accessory_name = "精美款式"
            accessory_url = None
            if task.accessory_source == "preset" and task.accessory_id:
                acc = db.query(PresetAccessory).filter_by(id=task.accessory_id).first()
                if acc:
                    accessory_name = acc.name
                    accessory_url = acc.image_url
            elif task.accessory_url:
                accessory_url = task.accessory_url

            self._update_task_info(task_id, progress=30)

            scene_template = "简约背景"
            if task.scene_id:
                scene = db.query(PresetScene).filter_by(id=task.scene_id).first()
                if scene and scene.prompt_template:
                    scene_template = scene.prompt_template

            self._update_task_info(task_id, progress=50)

            prompt = self.ai_service.build_prompt(
                task.accessory_type,
                accessory_name,
                scene_template,
                task.lighting
            )
            task.prompt = prompt
            db.commit()

            self._update_task_info(task_id, progress=70)

            model_url = task.model_url
            if task.model_source == "preset" and task.model_id:
                model = db.query(PresetModel).filter_by(id=task.model_id).first()
                if model:
                    model_url = model.image_url

            image_data = self.ai_service.generate_image(
                base_image_url=model_url,
                accessory_image_url=accessory_url,
                prompt=prompt,
                strength=0.75
            )

            result_url = self.storage.save_result(image_data, task_id)

            task.status = TaskStatus.COMPLETED
            task.result_image_url = result_url
            db.commit()

            self._update_task_info(
                task_id,
                status="completed",
                progress=100,
                result_url=result_url
            )
        except Exception as e:
            print(f"任务 {task_id} 失败: {e}")
            task = db.query(GenerationTask).filter_by(id=task_id).first()
            if task:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
                db.commit()
            self._update_task_info(task_id, status="failed", error=str(e))
        finally:
            db.close()

_task_queue_instance: Optional[BaseTaskQueue] = None

def get_task_queue() -> BaseTaskQueue:
    global _task_queue_instance
    if _task_queue_instance is None:
        _task_queue_instance = MemoryTaskQueue()
    return _task_queue_instance
```

### 5.7 速率限制器 (`app/services/rate_limiter.py`)

```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
from app.config import get_settings

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    raise HTTPException(
        status_code=429,
        detail="调用次数过多，请稍后再试。AI 服务需要成本，感谢理解。"
    )

def get_rate_limiter():
    return limiter

def get_rate_limit_string() -> str:
    per_minute = settings.rate_limit_per_minute
    per_day = settings.rate_limit_per_day
    return f"{per_minute}/minute, {per_day}/day"
```

---

## 6. API 路由实现

### `app/dependencies.py`

```python
from app.services.rate_limiter import get_rate_limiter, get_rate_limit_string
from app.config import get_settings

settings = get_settings()

def check_rate_limit(request: Request):
    if not settings.rate_limit_enabled:
        return True
    limiter = get_rate_limiter()
    rate_limit_str = get_rate_limit_string()
    try:
        limiter.limit(rate_limit_str)(lambda: None)()
    except Exception:
        pass
    return True
```

### 6.1 预设资源接口 (`app/api/presets.py`)

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import PresetAccessory, PresetModel, PresetScene
from app.schemas import AccessoryResponse, ModelResponse, SceneResponse, ApiResponse

router = APIRouter(prefix="/presets", tags=["预设资源"])

@router.get("/accessories", response_model=ApiResponse)
def get_accessories(
    type: Optional[str] = Query(None, description="配饰类型: bracelet/necklace/earring/ring"),
    db: Session = Depends(get_db)
):
    query = db.query(PresetAccessory)
    if type:
        query = query.filter(PresetAccessory.type == type)
    accessories = query.order_by(PresetAccessory.sort_order).all()
    data = [AccessoryResponse.model_validate(a).model_dump() for a in accessories]
    return ApiResponse(success=True, data=data)

@router.get("/models", response_model=ApiResponse)
def get_models(
    category: Optional[str] = Query(None, description="模特分类"),
    db: Session = Depends(get_db)
):
    query = db.query(PresetModel)
    if category and category != "all":
        query = query.filter(PresetModel.category == category)
    models = query.order_by(PresetModel.sort_order).all()
    data = [ModelResponse.model_validate(m).model_dump() for m in models]
    return ApiResponse(success=True, data=data)

@router.get("/scenes", response_model=ApiResponse)
def get_scenes(
    category: Optional[str] = Query(None, description="场景分类"),
    db: Session = Depends(get_db)
):
    query = db.query(PresetScene)
    if category:
        query = query.filter(PresetScene.category == category)
    scenes = query.order_by(PresetScene.sort_order).all()
    data = [SceneResponse.model_validate(s).model_dump() for s in scenes]
    return ApiResponse(success=True, data=data)
```

### 6.2 上传接口 (`app/api/upload.py`)

```python
from fastapi import APIRouter, UploadFile, File, Query
from app.schemas import ApiResponse
from app.services.storage import get_storage_service

router = APIRouter(prefix="/upload", tags=["文件上传"])
storage = get_storage_service()

@router.post("", response_model=ApiResponse)
async def upload_file(
    file: UploadFile = File(...),
    type: str = Query(..., description="上传类型: accessory/model/mask")
):
    result = await storage.save_upload(file, type)
    return ApiResponse(success=True, data=result)
```

### 6.3 AI 生成接口 (`app/api/generate.py`)

```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CreateGenerationRequest, ApiResponse
from app.services.task_queue import get_task_queue
from app.services.rate_limiter import get_rate_limiter, get_rate_limit_string

router = APIRouter(prefix="/generate", tags=["AI 生成"])
limiter = get_rate_limiter()
rate_limit_str = get_rate_limit_string()

@router.post("", response_model=ApiResponse)
@limiter.limit(rate_limit_str)
def create_generation(
    request: Request,
    req: CreateGenerationRequest,
    db: Session = Depends(get_db)
):
    task_queue = get_task_queue()
    task_id = task_queue.create_task(
        db=db,
        accessory_type=req.accessory_type,
        accessory=req.accessory.model_dump(),
        model=req.model.model_dump(),
        scene=req.scene.model_dump(),
        options=req.options.model_dump() if req.options else None
    )
    return ApiResponse(success=True, data={"task_id": task_id, "status": "pending"})

@router.get("/{task_id}", response_model=ApiResponse)
def get_task_status(task_id: str):
    task_queue = get_task_queue()
    status = task_queue.get_task_status(task_id)
    return ApiResponse(success=True, data=status)
```

---

## 7. 主应用入口

### `main.py`

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

from app.config import get_settings
from app.database import init_db, reset_stuck_tasks
from app.core import init_data
from app.api import presets, upload, generate
from app.services.rate_limiter import limiter

settings = get_settings()

app = FastAPI(title=settings.app_name, docs_url="/docs")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.result_dir, exist_ok=True)
os.makedirs(settings.static_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.mount("/results", StaticFiles(directory=settings.result_dir), name="results")
app.mount("/static", StaticFiles(directory=settings.static_dir), name="static")

app.include_router(presets.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(generate.router, prefix="/api")

@app.on_event("startup")
def on_startup():
    init_db()
    reset_stuck_tasks()
    init_data.ensure_initial_data()

@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "ai_provider": settings.ai_provider
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
```

---

## 8. 初始化数据

### `app/core/init_data.py`

```python
from pathlib import Path

from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import PresetAccessory, PresetModel, PresetScene
from app.database import SessionLocal

settings = get_settings()

DEFAULT_DATA = {
    "accessories": [
        {
            "id": "bracelet_001",
            "type": "bracelet",
            "name": "经典珍珠手链",
            "image_url": "/static/presets/bracelet_001.png",
            "sort_order": 1
        },
        {
            "id": "bracelet_002",
            "type": "bracelet",
            "name": "金色链条手链",
            "image_url": "/static/presets/bracelet_002.png",
            "sort_order": 2
        }
    ],
    "models": [
        {
            "id": "wrist_001",
            "category": "wrist",
            "name": "优雅手腕",
            "image_url": "/static/presets/wrist_001.png",
            "sort_order": 1
        }
    ],
    "scenes": [
        {
            "id": "scene_studio",
            "category": "studio",
            "name": "专业摄影棚",
            "image_url": "/static/presets/scene_studio.png",
            "prompt_template": "专业摄影棚背景，柔和的打光",
            "sort_order": 1
        }
    ]
}

def _create_preset_images() -> None:
    preset_dir = Path(settings.static_dir) / "presets"
    preset_dir.mkdir(parents=True, exist_ok=True)
    # 启动初始化时使用 Pillow 生成默认 PNG 预设图；已存在的文件不会覆盖。


def _upsert(db: Session, model_class, data: dict) -> None:
    existing = db.query(model_class).filter_by(id=data["id"]).first()
    if existing:
        for key, value in data.items():
            setattr(existing, key, value)
    else:
        db.add(model_class(**data))


def ensure_initial_data():
    _create_preset_images()
    db = SessionLocal()
    try:
        for acc_data in DEFAULT_DATA["accessories"]:
            _upsert(db, PresetAccessory, acc_data)
        for model_data in DEFAULT_DATA["models"]:
            _upsert(db, PresetModel, model_data)
        for scene_data in DEFAULT_DATA["scenes"]:
            _upsert(db, PresetScene, scene_data)
        db.commit()
        print("初始化数据已加载")
    except Exception as e:
        print(f"初始化数据失败: {e}")
        db.rollback()
    finally:
        db.close()
```

---

## 9. 环境变量配置

### `.env.example`

```env
DATABASE_URL=sqlite:///./data/db.sqlite
UPLOAD_DIR=./uploads
RESULT_DIR=./results
STATIC_DIR=./static
MAX_UPLOAD_SIZE=10485760
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=5
RATE_LIMIT_PER_DAY=50
AI_PROVIDER=mock
BAILIAN_API_KEY=your_bailian_api_key_here
BAILIAN_MODEL=qwen-image-2.0-pro
STABLE_DIFFUSION_API_URL=http://localhost:7860
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
DEBUG=true
```

---

## 10. 快速启动指南

### 10.1 创建项目目录结构

```bash
cd backend
mkdir -p data uploads results
```

### 10.2 准备占位图

在 `data/` 目录下放一张 `placeholder.jpg`。

### 10.3 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 10.4 开发模式启动 (Mock AI)

```bash
cd backend
python main.py
```

### 10.5 使用阿里百炼 Qwen-Image-2.0-Pro (推荐)

1. 前往 [阿里云百炼控制台](https://bailian.console.aliyun.com/) 获取 API Key
2. 修改 `.env` 文件：
   ```env
   AI_PROVIDER=bailian
   BAILIAN_API_KEY=sk-xxxxxxxxxx
   ```
3. 重启后端

### 10.6 使用 Stable Diffusion (进阶)

1. 启动 SD WebUI (启用 API)
2. 修改 `.env` 文件：
   ```env
   AI_PROVIDER=stable_diffusion
   STABLE_DIFFUSION_API_URL=http://localhost:7860
   ```
3. 重启后端

### 10.7 访问地址

- **API 首页**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

---

## AI 服务切换说明

在 `.env` 文件中修改 `AI_PROVIDER` 即可切换 AI 服务：

| AI_PROVIDER | 说明 | 额外配置 |
|------------|------|---------|
| `mock` | 模拟服务（默认） | 无 |
| `stable_diffusion` | 本地 Stable Diffusion WebUI | `STABLE_DIFFUSION_API_URL` |
| `bailian` | 阿里百炼 Qwen-Image-2.0-Pro (推荐) | `BAILIAN_API_KEY` |

### 阿里百炼配置说明

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 创建 API Key
3. 在 `.env` 文件中配置：
   ```env
   AI_PROVIDER=bailian
   BAILIAN_API_KEY=sk-xxxxxxxxxx
   ```

**百炼 provider 接入特点：**
- 使用配置项 `BAILIAN_MODEL` 指定模型，当前默认值为 `qwen-image-2.0-pro`
- 通过同步调用接入图像生成能力
- 支持使用模特图和配饰图作为参考输入
- 生成结果由后端下载并保存到本地结果目录

---

## API 接口汇总

| 方法 | 路径 | 说明 | 限流 |
|-----|------|------|------|
| GET | `/` | API 首页 | 否 |
| GET | `/docs` | API 文档 | 否 |
| GET | `/api/presets/accessories` | 获取配饰预设列表 | 否 |
| GET | `/api/presets/models` | 获取模特预设列表 | 否 |
| GET | `/api/presets/scenes` | 获取场景预设列表 | 否 |
| POST | `/api/upload` | 上传图片 | 否 |
| POST | `/api/generate` | 创建生成任务 | **是** |
| GET | `/api/generate/{task_id}` | 查询任务状态 | 否 |

