import bcrypt
import time
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import PasswordHistory
from app.config import get_settings

# 内存存储登录尝试记录（生产环境建议用 Redis）
login_attempts: Dict[str, List[float]] = {}
lockout_until: Dict[str, float] = {}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """获取密码哈希"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def check_login_attempt(username: str) -> Tuple[bool, str]:
    """检查登录尝试，防止暴力破解"""
    settings = get_settings()
    now = time.time()

    # 检查是否已被锁定
    if username in lockout_until:
        if now < lockout_until[username]:
            remaining = int(lockout_until[username] - now)
            return False, f"账号已锁定，请在 {remaining} 秒后重试"
        else:
            del lockout_until[username]

    # 清理过期的尝试记录
    if username in login_attempts:
        # 只保留最近 1 小时的记录
        login_attempts[username] = [t for t in login_attempts[username] if now - t < 3600]

    return True, ""


def record_login_attempt(username: str, success: bool):
    """记录登录尝试"""
    now = time.time()
    max_attempts = 5
    lockout_duration = 300  # 5 分钟

    if success:
        if username in login_attempts:
            del login_attempts[username]
        return

    if username not in login_attempts:
        login_attempts[username] = []
    login_attempts[username].append(now)

    # 检查是否达到锁定条件
    if len(login_attempts[username]) >= max_attempts:
        lockout_until[username] = now + lockout_duration
        if username in login_attempts:
            del login_attempts[username]


def check_password_history(db: Session, user_id: str, new_password: str) -> bool:
    """检查新密码是否在历史记录中"""
    settings = get_settings()

    # 获取最近的密码历史记录
    recent_passwords = (
        db.query(PasswordHistory)
        .filter(PasswordHistory.user_id == user_id)
        .order_by(PasswordHistory.created_at.desc())
        .limit(settings.password_history_limit)
        .all()
    )

    # 检查新密码是否与历史密码重复
    for record in recent_passwords:
        if verify_password(new_password, record.hashed_password):
            return True

    return False


def save_password_to_history(db: Session, user_id: str, hashed_password: str):
    """保存密码到历史记录"""
    settings = get_settings()

    # 添加新记录
    new_record = PasswordHistory(
        user_id=user_id,
        hashed_password=hashed_password
    )
    db.add(new_record)

    # 清理旧记录，只保留指定数量
    recent_records = (
        db.query(PasswordHistory.id)
        .filter(PasswordHistory.user_id == user_id)
        .order_by(PasswordHistory.created_at.desc())
        .limit(settings.password_history_limit)
        .all()
    )
    recent_ids = [r.id for r in recent_records]

    db.query(PasswordHistory).filter(
        PasswordHistory.user_id == user_id,
        PasswordHistory.id.not_in(recent_ids)
    ).delete(synchronize_session=False)

    db.commit()
