from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import secrets

from app.config import get_settings
from app.models import User, RefreshToken

settings = get_settings()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建 Access Token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def create_refresh_token(db: Session, user_id: str) -> str:
    """创建 Refresh Token 并保存到数据库"""
    # 撤销该用户之前的所有 Refresh Token
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None)
    ).update({RefreshToken.revoked_at: datetime.utcnow()})

    # 生成新的 Refresh Token
    token = secrets.token_urlsafe(64)
    expires_at = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)

    db_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(db_token)
    db.commit()

    return token


def verify_token(token: str) -> Optional[str]:
    """验证 Access Token，返回用户 ID 或 None"""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


def refresh_access_token(db: Session, refresh_token: str) -> Optional[tuple[str, str]]:
    """使用 Refresh Token 获取新的 Access Token，返回 (access_token, new_refresh_token) 或 None"""
    # 查找有效的 Refresh Token
    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == refresh_token)
        .filter(RefreshToken.revoked_at.is_(None))
        .filter(RefreshToken.expires_at > datetime.utcnow())
        .first()
    )

    if not db_token:
        return None

    # 撤销旧的 Refresh Token
    db_token.revoked_at = datetime.utcnow()
    db.commit()

    # 检查用户是否仍然存在且活跃
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user or not user.is_active:
        return None

    # 生成新的 Access Token 和 Refresh Token
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(data={"sub": user.id}, expires_delta=access_token_expires)
    new_refresh_token = create_refresh_token(db, user.id)

    return access_token, new_refresh_token


def revoke_token(db: Session, refresh_token: str):
    """撤销 Refresh Token"""
    db.query(RefreshToken).filter(RefreshToken.token == refresh_token).update({
        RefreshToken.revoked_at: datetime.utcnow()
    })
    db.commit()


def revoke_all_user_tokens(db: Session, user_id: str):
    """撤销用户的所有 Refresh Token"""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None)
    ).update({RefreshToken.revoked_at: datetime.utcnow()})
    db.commit()


def generate_verification_token() -> str:
    """生成邮箱验证 Token"""
    return secrets.token_urlsafe(32)


def generate_password_reset_token() -> str:
    """生成密码重置 Token"""
    return secrets.token_urlsafe(32)
