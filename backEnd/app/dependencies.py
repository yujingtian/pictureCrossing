from fastapi import Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime

from app.services.rate_limiter import get_rate_limiter, get_rate_limit_string
from app.config import get_settings
from app.database import get_db
from app.models import User
from app.core.auth import verify_token

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


# 定义认证方案
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """获取当前登录用户，未认证则抛出 401"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的认证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    try:
        token = credentials.credentials
        user_id = verify_token(token)
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已禁用"
        )

    # 更新最后活动时间
    user.last_activity_at = datetime.utcnow()
    db.commit()

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
):
    """获取当前活跃用户（已认证且账号启用）"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已禁用"
        )
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前管理员用户"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """获取当前用户（可选，未认证返回 None）"""
    if not credentials:
        return None

    try:
        token = credentials.credentials
        user_id = verify_token(token)
        if user_id is None:
            return None

        user = db.query(User).filter(User.id == user_id).first()
        if user is None or not user.is_active:
            return None

        # 更新最后活动时间
        user.last_activity_at = datetime.utcnow()
        db.commit()

        return user
    except Exception:
        return None
