
from app.database import engine
from sqlalchemy import text

TABLES_TO_SHOW = [
    'users',
    'generation_tasks',
    'preset_accessories',
    'preset_models',
    'preset_scenes',
]

with engine.connect() as conn:
    print("=" * 80)
    print("SQLITE 数据库查询工具")
    print("=" * 80)

    for table in TABLES_TO_SHOW:
        print(f"\n--- 表: {table} ---")

        # 先查行数
        result = conn.execute(text(f'SELECT COUNT(*) FROM {table}'))
        count = result.fetchone()[0]
        print(f"总行数: {count}")

        if count > 0:
            # 查看表结构
            result = conn.execute(text(f'PRAGMA table_info({table})'))
            columns = [row[1] for row in result]
            print(f"列: {', '.join(columns)}")

            # 显示前5行数据
            print("\n数据预览 (前5行):")
            result = conn.execute(text(f'SELECT * FROM {table} ORDER BY id DESC LIMIT 5'))
            rows = result.fetchall()
            for row in rows:
                # 简化显示，只显示非空字段的前50字符
                row_data = []
                for col, val in zip(columns, row):
                    if val is not None:
                        val_str = str(val)
                        if len(val_str) > 50:
                            val_str = val_str[:47] + '...'
                        row_data.append(f"{col}={val_str}")
                print(f"  {' | '.join(row_data)}")

    print("\n" + "=" * 80)
    print("提示: 如果需要图形界面，推荐使用 'DB Browser for SQLite'")
    print("=" * 80)
