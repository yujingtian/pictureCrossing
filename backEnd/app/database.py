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
