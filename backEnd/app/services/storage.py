import logging
import os
import uuid
from fastapi import UploadFile, HTTPException
from PIL import Image
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class StorageService:
    def __init__(self):
        self.upload_dir = settings.upload_dir
        self.result_dir = settings.result_dir
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.result_dir, exist_ok=True)

    async def save_upload(self, file: UploadFile, file_type: str) -> dict:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="只支持图片文件")

        contents = await file.read()
        if len(contents) > settings.max_upload_size:
            raise HTTPException(status_code=413, detail="图片大小超过限制")

        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
        file_id = f"{file_type}_{uuid.uuid4().hex[:12]}"
        filename = f"{file_id}.{ext}"
        filepath = os.path.join(self.upload_dir, filename)

        with open(filepath, "wb") as f:
            f.write(contents)

        thumb_filename = None
        try:
            candidate_thumb_filename = f"{file_id}_thumb.jpg"
            thumb_filepath = os.path.join(self.upload_dir, candidate_thumb_filename)
            with Image.open(filepath) as img:
                img.thumbnail((200, 200))
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(thumb_filepath, "JPEG", quality=85)
            thumb_filename = candidate_thumb_filename
        except Exception:
            logger.warning("缩略图生成失败", exc_info=True)

        return {
            "file_id": file_id,
            "url": f"/uploads/{filename}",
            "thumbnail_url": f"/uploads/{thumb_filename}" if thumb_filename else None
        }

    def save_result(self, image_data: bytes, task_id: str) -> str:
        filename = f"result_{task_id}.jpg"
        filepath = os.path.join(self.result_dir, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return f"/results/{filename}"

    def get_public_url(self, key: str) -> str:
        if key.startswith("/uploads/") or key.startswith("/results/"):
            return key
        return f"/uploads/{key}"


def get_storage_service() -> StorageService:
    return StorageService()
