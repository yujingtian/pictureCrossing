"""
数据库迁移脚本
将旧的 recommendation_images 表结构迁移到新结构
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "db.sqlite"


def migrate_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 先检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='recommendation_images'")
        if not cursor.fetchone():
            print("表不存在，无需迁移")
            return

        # 检查当前表结构
        cursor.execute("PRAGMA table_info(recommendation_images)")
        columns = {row[1]: row for row in cursor.fetchall()}

        # 检查是否已经有type字段
        if "type" in columns and "position" not in columns:
            print("数据库已经是最新结构，无需迁移")
            return

        print("开始迁移数据库...")

        # 备份现有数据
        cursor.execute("SELECT * FROM recommendation_images")
        old_rows = cursor.fetchall()
        print(f"找到 {len(old_rows)} 条现有数据")

        # 获取旧表的列名
        old_columns = [desc[0] for desc in cursor.description]
        print(f"旧表列: {old_columns}")

        # 重命名旧表
        cursor.execute("ALTER TABLE recommendation_images RENAME TO recommendation_images_old")

        # 创建新表
        cursor.execute("""
            CREATE TABLE recommendation_images (
                id VARCHAR(36) PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                image_url VARCHAR(500) NOT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'accessory',
                sort_order INTEGER DEFAULT 0 NOT NULL,
                is_active BOOLEAN DEFAULT 1 NOT NULL,
                deleted_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 迁移数据
        # 找出我们需要的列的索引
        col_indices = {name: i for i, name in enumerate(old_columns)}

        for row in old_rows:
            id_val = row[col_indices['id']]
            title_val = row[col_indices['title']]
            desc_val = row[col_indices['description']] if 'description' in col_indices else None
            image_url_val = row[col_indices['image_url']]
            sort_order_val = row[col_indices['sort_order']] if 'sort_order' in col_indices else 0
            is_active_val = row[col_indices['is_active']] if 'is_active' in col_indices else 1
            deleted_at_val = row[col_indices['deleted_at']] if 'deleted_at' in col_indices else None
            created_at_val = row[col_indices['created_at']] if 'created_at' in col_indices else None
            updated_at_val = row[col_indices['updated_at']] if 'updated_at' in col_indices else None

            # 根据position确定type
            type_val = 'accessory'
            if 'position' in col_indices:
                pos_val = row[col_indices['position']]
                if pos_val in ['model', 'wrist']:
                    type_val = 'model'

            cursor.execute("""
                INSERT INTO recommendation_images
                (id, title, description, image_url, type, sort_order, is_active, deleted_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (id_val, title_val, desc_val, image_url_val, type_val, sort_order_val, is_active_val, deleted_at_val, created_at_val, updated_at_val))

        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendation_images(type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_recommendations_active ON recommendation_images(is_active)")

        # 删除旧表
        cursor.execute("DROP TABLE recommendation_images_old")

        conn.commit()
        print("数据库迁移成功！")

        # 显示迁移后的数据
        cursor.execute("SELECT id, title, type, sort_order FROM recommendation_images")
        rows = cursor.fetchall()
        print(f"\n迁移后共有 {len(rows)} 条推荐图记录:")
        for row in rows:
            print(f"  - {row[1]} (type: {row[2]}, order: {row[3]})")

    except Exception as e:
        conn.rollback()
        print(f"迁移失败: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
