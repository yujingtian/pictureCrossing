from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import enum
import uuid


Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)

    # 生成次数配额
    quota_total = Column(Integer, default=10, nullable=False)
    quota_used = Column(Integer, default=0, nullable=False)

    # 账号状态
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)

    # 邮箱验证
    email_verification_token = Column(String(100), nullable=True)
    email_verification_sent_at = Column(DateTime, nullable=True)

    # 密码重置
    password_reset_token = Column(String(100), nullable=True, index=True)
    password_reset_expires_at = Column(DateTime, nullable=True)

    # 活动记录
    last_login_at = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)

    # 首次登录强制修改密码
    require_password_change = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # 关联
    tasks = relationship("GenerationTask", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    password_history = relationship("PasswordHistory", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    """Refresh Token 表（支持登出/撤销）"""
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")


class PasswordHistory(Base):
    """密码历史记录（防止近期重复使用）"""
    __tablename__ = "password_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="password_history")


class AuditLog(Base):
    """审计日志"""
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(36), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")


class RecommendationImage(Base):
    """推荐图配置"""
    __tablename__ = "recommendation_images"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=False)
    type = Column(String(50), nullable=False, index=True)  # "accessory" 或 "model"
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class PresetAccessory(Base):
    __tablename__ = "preset_accessories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    type = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    image_url = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class PresetModel(Base):
    __tablename__ = "preset_models"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    image_url = Column(String(500), nullable=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class PresetScene(Base):
    __tablename__ = "preset_scenes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    image_url = Column(String(500), nullable=False)
    prompt_template = Column(Text)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class GenerationTask(Base):
    __tablename__ = "generation_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, index=True)
    accessory_type = Column(String(50), nullable=False)

    accessory_source = Column(String(20))
    accessory_id = Column(String(100))
    accessory_url = Column(String(500))

    model_source = Column(String(20))
    model_id = Column(String(100))
    model_url = Column(String(500))
    model_mask_url = Column(String(500))

    scene_id = Column(String(100))

    lighting = Column(String(50), default="natural")
    prompt = Column(Text)

    result_image_url = Column(String(500))
    error_message = Column(Text)

    # 用户关联
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    user = relationship("User", back_populates="tasks")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
