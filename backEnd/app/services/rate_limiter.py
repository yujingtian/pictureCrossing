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
