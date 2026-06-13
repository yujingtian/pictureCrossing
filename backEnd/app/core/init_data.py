from pathlib import Path

from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models import PresetAccessory, PresetModel, PresetScene

settings = get_settings()


DEFAULT_DATA = {
    "accessories": [
        {
            "id": "bracelet_001",
            "type": "bracelet",
            "name": "经典珍珠手链",
            "image_url": "/static/presets/bracelet_001.png",
            "sort_order": 1
        },
        {
            "id": "bracelet_002",
            "type": "bracelet",
            "name": "金色链条手链",
            "image_url": "/static/presets/bracelet_002.png",
            "sort_order": 2
        }
    ],
    "models": [
        {
            "id": "wrist_001",
            "category": "wrist",
            "name": "优雅手腕",
            "image_url": "/static/presets/wrist_001.png",
            "sort_order": 1
        },
        {
            "id": "wrist_002",
            "category": "wrist",
            "name": "时尚手腕",
            "image_url": "/static/presets/wrist_002.png",
            "sort_order": 2
        }
    ],
    "scenes": [
        {
            "id": "scene_studio",
            "category": "studio",
            "name": "专业摄影棚",
            "image_url": "/static/presets/scene_studio.png",
            "prompt_template": "专业摄影棚背景，柔和的打光",
            "sort_order": 1
        },
        {
            "id": "scene_nature",
            "category": "nature",
            "name": "自然户外",
            "image_url": "/static/presets/scene_nature.png",
            "prompt_template": "自然户外背景，阳光明媚",
            "sort_order": 2
        }
    ]
}


def _draw_centered_text(draw: ImageDraw.ImageDraw, size: tuple[int, int], text: str, fill: str) -> None:
    bbox = draw.textbbox((0, 0), text)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    draw.text(((size[0] - width) / 2, size[1] - height - 18), text, fill=fill)


def _create_preset_images() -> None:
    preset_dir = Path(settings.static_dir) / "presets"
    preset_dir.mkdir(parents=True, exist_ok=True)

    image_specs = {
        "bracelet_001.png": (240, 240, "#f8f2ea", "#f0e6d6", "Pearl Bracelet"),
        "bracelet_002.png": (240, 240, "#f8f2ea", "#d8a64a", "Gold Bracelet"),
        "wrist_001.png": (480, 360, "#f5efe7", "#e7b98f", "Elegant Wrist"),
        "wrist_002.png": (480, 360, "#f2ede8", "#d9a47a", "Fashion Wrist"),
        "scene_studio.png": (480, 360, "#eef1f5", "#b8c3d0", "Studio"),
        "scene_nature.png": (480, 360, "#edf5ea", "#9dc58d", "Nature"),
    }

    for filename, (width, height, background, accent, label) in image_specs.items():
        path = preset_dir / filename
        if path.exists():
            continue

        image = Image.new("RGB", (width, height), background)
        draw = ImageDraw.Draw(image)

        if filename.startswith("bracelet"):
            center = (width // 2, height // 2 - 8)
            radius = min(width, height) // 4
            draw.ellipse(
                (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
                outline=accent,
                width=10,
            )
            for x, y in [
                (center[0] - radius, center[1]),
                (center[0] + radius, center[1]),
                (center[0], center[1] - radius),
                (center[0], center[1] + radius),
            ]:
                draw.ellipse((x - 13, y - 13, x + 13, y + 13), fill="#fffaf2", outline=accent, width=3)
        elif filename.startswith("wrist"):
            draw.rounded_rectangle((70, 130, width - 70, 215), radius=42, fill=accent)
            draw.ellipse((width - 140, 105, width - 65, 180), fill=accent)
            draw.arc((110, 100, width - 120, 240), 0, 180, fill="#d8a64a", width=8)
        else:
            draw.rounded_rectangle((50, 54, width - 50, height - 76), radius=28, fill=accent)
            draw.ellipse((90, 86, 160, 156), fill="#ffffff")
            draw.rectangle((0, height - 120, width, height), fill="#f7f7f7")

        _draw_centered_text(draw, (width, height), label, "#333333")
        image.save(path, format="PNG")


def _upsert(db: Session, model_class, data: dict) -> None:
    existing = db.query(model_class).filter_by(id=data["id"]).first()
    if existing:
        for key, value in data.items():
            setattr(existing, key, value)
    else:
        db.add(model_class(**data))


def ensure_initial_data():
    _create_preset_images()

    db = SessionLocal()
    try:
        for acc_data in DEFAULT_DATA["accessories"]:
            _upsert(db, PresetAccessory, acc_data)

        for model_data in DEFAULT_DATA["models"]:
            _upsert(db, PresetModel, model_data)

        for scene_data in DEFAULT_DATA["scenes"]:
            _upsert(db, PresetScene, scene_data)

        db.commit()
        print("初始化数据已加载")
    except Exception as e:
        print(f"初始化数据失败: {e}")
        db.rollback()
    finally:
        db.close()
