"""
初始化推荐图数据
"""
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "db.sqlite"


def init_recommendations():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 检查是否已有推荐图数据
        cursor.execute("SELECT COUNT(*) FROM recommendation_images WHERE deleted_at IS NULL")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"已存在 {count} 条推荐图数据，跳过初始化")
            return

        print("添加推荐图数据...")

        now = datetime.utcnow().isoformat()

        # 推荐图数据
        recommendations = [
            {
                "id": str(uuid.uuid4()),
                "title": "珍珠手链",
                "description": "优雅珍珠手链推荐",
                "image_url": "/static/presets/bracelet_001.png",
                "type": "accessory",
                "sort_order": 1,
                "is_active": 1,
                "created_at": now,
                "updated_at": now
            },
            {
                "id": str(uuid.uuid4()),
                "title": "金色手链",
                "description": "时尚金色手链推荐",
                "image_url": "/static/presets/bracelet_002.png",
                "type": "accessory",
                "sort_order": 2,
                "is_active": 1,
                "created_at": now,
                "updated_at": now
            },
            {
                "id": str(uuid.uuid4()),
                "title": "优雅手腕",
                "description": "优雅模特手腕展示",
                "image_url": "/static/presets/wrist_001.png",
                "type": "model",
                "sort_order": 1,
                "is_active": 1,
                "created_at": now,
                "updated_at": now
            },
            {
                "id": str(uuid.uuid4()),
                "title": "时尚手腕",
                "description": "时尚模特手腕展示",
                "image_url": "/static/presets/wrist_002.png",
                "type": "model",
                "sort_order": 2,
                "is_active": 1,
                "created_at": now,
                "updated_at": now
            }
        ]

        for rec in recommendations:
            cursor.execute("""
                INSERT INTO recommendation_images
                (id, title, description, image_url, type, sort_order, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rec["id"], rec["title"], rec["description"], rec["image_url"], rec["type"], rec["sort_order"], rec["is_active"], rec["created_at"], rec["updated_at"]))

        conn.commit()
        print(f"成功添加 {len(recommendations)} 条推荐图数据")

        # 显示添加的数据
        cursor.execute("SELECT id, title, type, sort_order FROM recommendation_images ORDER BY type, sort_order")
        rows = cursor.fetchall()
        print("\n已添加的推荐图:")
        for row in rows:
            print(f"  - [{row[2]}] {row[1]} (order: {row[3]})")

    except Exception as e:
        conn.rollback()
        print(f"添加数据失败: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    init_recommendations()
