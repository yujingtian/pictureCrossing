#!/usr/bin/env python3
"""
SQLite 到 MySQL 数据迁移脚本

使用方法:
1. 先确保 MySQL 数据库已创建并执行 alembic migration
2. 运行此脚本: python scripts/migrate_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.models import PresetAccessory, PresetModel, PresetScene, GenerationTask
from app.database import SessionLocal


def migrate_from_sqlite(sqlite_path: str, db):
    """从 SQLite 迁移数据到 MySQL"""

    # 连接 SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    try:
        # 迁移预设配饰
        print("正在迁移 preset_accessories...")
        sqlite_cursor.execute("SELECT * FROM preset_accessories")
        for row in sqlite_cursor.fetchall():
            if not db.query(PresetAccessory).get(row["id"]):
                db.add(PresetAccessory(
                    id=row["id"],
                    type=row["type"],
                    name=row["name"],
                    image_url=row["image_url"],
                    sort_order=row["sort_order"],
                    created_at=row["created_at"]
                ))
        db.commit()

        # 迁移预设模特
        print("正在迁移 preset_models...")
        sqlite_cursor.execute("SELECT * FROM preset_models")
        for row in sqlite_cursor.fetchall():
            if not db.query(PresetModel).get(row["id"]):
                db.add(PresetModel(
                    id=row["id"],
                    category=row["category"],
                    name=row["name"],
                    image_url=row["image_url"],
                    sort_order=row["sort_order"],
                    created_at=row["created_at"]
                ))
        db.commit()

        # 迁移预设场景
        print("正在迁移 preset_scenes...")
        sqlite_cursor.execute("SELECT * FROM preset_scenes")
        for row in sqlite_cursor.fetchall():
            if not db.query(PresetScene).get(row["id"]):
                db.add(PresetScene(
                    id=row["id"],
                    category=row["category"],
                    name=row["name"],
                    image_url=row["image_url"],
                    prompt_template=row["prompt_template"],
                    sort_order=row["sort_order"],
                    created_at=row["created_at"]
                ))
        db.commit()

        # 迁移生成任务
        print("正在迁移 generation_tasks...")
        sqlite_cursor.execute("SELECT * FROM generation_tasks")
        for row in sqlite_cursor.fetchall():
            if not db.query(GenerationTask).get(row["id"]):
                db.add(GenerationTask(
                    id=row["id"],
                    status=row["status"],
                    accessory_type=row["accessory_type"],
                    accessory_source=row["accessory_source"],
                    accessory_id=row["accessory_id"],
                    accessory_url=row["accessory_url"],
                    model_source=row["model_source"],
                    model_id=row["model_id"],
                    model_url=row["model_url"],
                    model_mask_url=row["model_mask_url"],
                    scene_id=row["scene_id"],
                    lighting=row["lighting"],
                    prompt=row["prompt"],
                    result_image_url=row["result_image_url"],
                    error_message=row["error_message"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"]
                ))
        db.commit()

        print("数据迁移完成!")

    except Exception as e:
        db.rollback()
        print(f"迁移失败: {e}")
        raise
    finally:
        sqlite_conn.close()


if __name__ == "__main__":
    settings = get_settings()

    if "sqlite" in settings.database_url:
        print("当前配置使用的是 SQLite，无需迁移")
        sys.exit(0)

    sqlite_path = "data/db.sqlite"
    if not os.path.exists(sqlite_path):
        print(f"找不到 SQLite 数据库: {sqlite_path}")
        sys.exit(1)

    print(f"开始从 SQLite 迁移数据到 MySQL...")
    print(f"源数据库: {sqlite_path}")
    print(f"目标数据库: {settings.database_url}")

    db = SessionLocal()
    try:
        migrate_from_sqlite(sqlite_path, db)
    finally:
        db.close()
