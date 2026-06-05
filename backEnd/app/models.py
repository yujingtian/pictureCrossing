from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import declarative_base
from datetime import datetime
import enum


Base = declarative_base()


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
