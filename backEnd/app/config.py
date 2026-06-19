from pydantic_settings import BaseSettings
from typing import List, Literal, Optional
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "AI 试衣间 API"
    debug: bool = True

    # MySQL 数据库配置
    database_url: str = "sqlite:///./data/db.sqlite"
    pool_size: int = 5
    max_overflow: int = 10
    pool_timeout: int = 30
    pool_recycle: int = 3600

    upload_dir: str = "./uploads"
    result_dir: str = "./results"
    static_dir: str = "./static"
    max_upload_size: int = 10 * 1024 * 1024

    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 5
    rate_limit_per_day: int = 50

    # AI 服务配置
    ai_provider: Literal["mock", "stable_diffusion", "bailian"] = "mock"
    # 阿里百炼配置
    bailian_api_key: str = ""
    bailian_model: str = "qwen-image-2.0-pro"
    bailian_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
    # Stable Diffusion 配置
    stable_diffusion_api_url: str = "http://localhost:7860"

    # 兼容旧配置，ImageGeneration.call 已改用 Base64 输入，不再依赖公网图片地址
    public_base_url: str = ""

    # JWT 配置
    jwt_secret_key: str = "your-super-secret-key-change-in-production-please"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440
    jwt_refresh_token_expire_days: int = 7

    # 默认配额
    default_quota: int = 10

    # 密码策略
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_digits: bool = True
    password_require_special: bool = False
    password_history_limit: int = 5

    # 邮件配置（可选，用于发送验证邮件和重置密码邮件）
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None

    # 邮箱验证开关
    require_email_verification: bool = False

    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8"
    }


@lru_cache()
def get_settings():
    return Settings()
