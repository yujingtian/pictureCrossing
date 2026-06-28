#!/usr/bin/env python3
"""
清理旧的预设表脚本
删除不再使用的 preset_accessories 和 preset_models 表
保留 preset_scenes 表（仍在使用中）
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from sqlalchemy import text


def cleanup_old_tables():
    print("开始清理旧的预设表...")

    db = SessionLocal()
    try:
        # 检查并删除 preset_accessories 表
        print("\n检查 preset_accessories 表...")
        try:
            db.execute(text("SELECT 1 FROM preset_accessories LIMIT 1"))
            print("发现 preset_accessories 表，准备删除...")
            confirm = input("确认删除 preset_accessories 表？(yes/no): ").strip().lower()
            if confirm == 'yes':
                db.execute(text("DROP TABLE preset_accessories"))
                db.commit()
                print("✓ 已删除 preset_accessories 表")
            else:
                print("跳过 preset_accessories 表")
        except Exception as e:
            if "no such table" in str(e).lower():
                print("preset_accessories 表不存在，无需删除")
            else:
                print(f"检查 preset_accessories 表时出错: {e}")
                db.rollback()

        # 检查并删除 preset_models 表
        print("\n检查 preset_models 表...")
        try:
            db.execute(text("SELECT 1 FROM preset_models LIMIT 1"))
            print("发现 preset_models 表，准备删除...")
            confirm = input("确认删除 preset_models 表？(yes/no): ").strip().lower()
            if confirm == 'yes':
                db.execute(text("DROP TABLE preset_models"))
                db.commit()
                print("✓ 已删除 preset_models 表")
            else:
                print("跳过 preset_models 表")
        except Exception as e:
            if "no such table" in str(e).lower():
                print("preset_models 表不存在，无需删除")
            else:
                print(f"检查 preset_models 表时出错: {e}")
                db.rollback()

        print("\n清理完成！")
        print("\n说明：")
        print("- preset_accessories 和 preset_models 已统一迁移到 recommendation_images 表")
        print("- preset_scenes 表仍在使用中，因此保留")

    except Exception as e:
        print(f"\n清理失败: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    cleanup_old_tables()
