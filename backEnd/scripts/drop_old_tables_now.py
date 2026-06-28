#!/usr/bin/env python3
"""
直接删除旧的预设表（非交互式）
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from sqlalchemy import text


def drop_old_tables():
    print("Starting to drop old preset tables...")

    db = SessionLocal()
    try:
        # 删除 preset_accessories 表
        try:
            db.execute(text("DROP TABLE IF EXISTS preset_accessories"))
            print("Dropped preset_accessories table")
        except Exception as e:
            print(f"Error dropping preset_accessories: {e}")

        # 删除 preset_models 表
        try:
            db.execute(text("DROP TABLE IF EXISTS preset_models"))
            print("Dropped preset_models table")
        except Exception as e:
            print(f"Error dropping preset_models: {e}")

        db.commit()
        print("\nDone! Old tables cleaned up.")

    except Exception as e:
        print(f"\nOperation failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    drop_old_tables()
