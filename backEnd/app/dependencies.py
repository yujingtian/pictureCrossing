from fastapi import Request

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
