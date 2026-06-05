from pydantic_settings import BaseSettings
from typing import List, Literal
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "AI 试衣间 API"
    debug: bool = True

    database_url: str = "sqlite:///./data/db.sqlite"
    upload_dir: str = "./uploads"
    result_dir: str = "./results"
    max_upload_size: int = 10 * 1024 * 1024

    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 5
    rate_limit_per_day: int = 50

    # AI 服务配置
    ai_provider: Literal["mock", "stable_diffusion", "bailian"] = "mock"
    # 阿里百炼配置
    bailian_api_key: str = ""
    bailian_model: str = "wanx2.7-image-pro"
    # Stable Diffusion 配置
    stable_diffusion_api_url: str = "http://localhost:7860"

    # 公网可访问的服务基址，用于将本地图片暴露给百炼等远程服务
    # 例如：http://your-domain.com 或 http://公网IP:8000
    public_base_url: str = ""

    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8"
    }


@lru_cache()
def get_settings():
    return Settings()
