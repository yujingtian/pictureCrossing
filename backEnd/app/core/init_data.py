from sqlalchemy.orm import Session
from app.models import PresetAccessory, PresetModel, PresetScene
from app.database import SessionLocal


DEFAULT_DATA = {
    "accessories": [
        {
            "id": "bracelet_001",
            "type": "bracelet",
            "name": "经典珍珠手链",
            "image_url": "https://via.placeholder.com/200x200/f5f0e8/333333?text=Pearl+Bracelet",
            "sort_order": 1
        },
        {
            "id": "bracelet_002",
            "type": "bracelet",
            "name": "金色链条手链",
            "image_url": "https://via.placeholder.com/200x200/f5f0e8/333333?text=Gold+Bracelet",
            "sort_order": 2
        }
    ],
    "models": [
        {
            "id": "wrist_001",
            "category": "wrist",
            "name": "优雅手腕",
            "image_url": "https://via.placeholder.com/400x500/e8e0d0/333333?text=Wrist+Model"
        },
        {
            "id": "wrist_002",
            "category": "wrist",
            "name": "时尚手腕",
            "image_url": "https://via.placeholder.com/400x500/e8e0d0/333333?text=Wrist+Model+2"
        }
    ],
    "scenes": [
        {
            "id": "scene_studio",
            "category": "studio",
            "name": "专业摄影棚",
            "image_url": "https://via.placeholder.com/400x300/d0d8e0/333333?text=Studio",
            "prompt_template": "专业摄影棚背景，柔和的打光"
        },
        {
            "id": "scene_nature",
            "category": "nature",
            "name": "自然户外",
            "image_url": "https://via.placeholder.com/400x300/d0e8d0/333333?text=Nature",
            "prompt_template": "自然户外背景，阳光明媚"
        }
    ]
}


def ensure_initial_data():
    db = SessionLocal()
    try:
        for acc_data in DEFAULT_DATA["accessories"]:
            existing = db.query(PresetAccessory).filter_by(id=acc_data["id"]).first()
            if not existing:
                acc = PresetAccessory(**acc_data)
                db.add(acc)

        for model_data in DEFAULT_DATA["models"]:
            existing = db.query(PresetModel).filter_by(id=model_data["id"]).first()
            if not existing:
                model = PresetModel(**model_data)
                db.add(model)

        for scene_data in DEFAULT_DATA["scenes"]:
            existing = db.query(PresetScene).filter_by(id=scene_data["id"]).first()
            if not existing:
                scene = PresetScene(**scene_data)
                db.add(scene)

        db.commit()
        print("初始化数据已加载")
    except Exception as e:
        print(f"初始化数据失败: {e}")
        db.rollback()
    finally:
        db.close()
