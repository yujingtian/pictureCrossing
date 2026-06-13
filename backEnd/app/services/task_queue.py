import logging
import uuid
import threading
import time
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.models import GenerationTask, TaskStatus, PresetAccessory, PresetScene, PresetModel
from app.services.ai_service import get_ai_service
from app.services.storage import get_storage_service
from app.config import get_settings
from app.database import SessionLocal

settings = get_settings()
logger = logging.getLogger(__name__)
QWEN_IMAGE_MODEL = "qwen-image-2.0-pro"


class TaskQueue:
    def __init__(self):
        self.ai_service = get_ai_service()
        self.storage = get_storage_service()
        self.tasks: Dict[str, dict] = {}
        self.lock = threading.Lock()
        self._start_worker()

    def _start_worker(self):
        worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        worker_thread.start()

    def _worker_loop(self):
        while True:
            task_id = None
            with self.lock:
                for tid, info in self.tasks.items():
                    if info["status"] == "pending":
                        task_id = tid
                        info["status"] = "processing"
                        info["progress"] = 10
                        break
            if task_id:
                self._execute_task(task_id)
            else:
                time.sleep(1)

    def create_task(self, db: Session, accessory_type: str,
                    accessory: dict, model: dict, scene: dict = None,
                    options: dict = None) -> str:
        task_id = f"task_{uuid.uuid4().hex[:16]}"
        options = options or {}

        task = GenerationTask(
            id=task_id,
            status=TaskStatus.PENDING,
            accessory_type=accessory_type,
            accessory_source=accessory.get("source"),
            accessory_id=accessory.get("id"),
            accessory_url=accessory.get("url"),
            model_source=model.get("source"),
            model_id=model.get("id"),
            model_url=model.get("url"),
            model_mask_url=model.get("mask_url"),
            scene_id=scene.get("id") if scene else None,
            lighting=options.get("lighting", "natural")
        )
        db.add(task)
        db.commit()

        with self.lock:
            self.tasks[task_id] = {
                "status": "pending",
                "progress": 0,
                "result_url": None,
                "error": None,
                "options": {
                    "prompt": options.get("prompt"),
                    "negative_prompt": options.get("negative_prompt") or "",
                    "model": options.get("model"),
                    "strength": options.get("strength", 0.75),
                    "guidance_scale": options.get("guidance_scale", 7.5),
                }
            }

        return task_id

    def _update_task_info(self, task_id: str, **kwargs):
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id].update(kwargs)

    def get_task_status(self, task_id: str, db: Session = None) -> dict:
        with self.lock:
            if task_id in self.tasks:
                info = self.tasks[task_id].copy()
                info["task_id"] = task_id
                return info

        if db:
            task = db.query(GenerationTask).filter_by(id=task_id).first()
            if task:
                return self._build_db_task_status(task)

        return {"task_id": task_id, "status": "not_found"}

    def _build_db_task_status(self, task: GenerationTask) -> dict:
        progress_by_status = {
            TaskStatus.PENDING: 0,
            TaskStatus.PROCESSING: 10,
            TaskStatus.COMPLETED: 100,
            TaskStatus.FAILED: 100,
        }
        return {
            "task_id": task.id,
            "status": task.status.value,
            "progress": progress_by_status.get(task.status, 0),
            "result_url": task.result_image_url,
            "error": task.error_message,
        }

    def _get_task_options(self, task_id: str) -> dict:
        with self.lock:
            return self.tasks.get(task_id, {}).get("options", {}).copy()

    def _resolve_accessory(self, db: Session, task: GenerationTask) -> tuple[str, Optional[str]]:
        accessory_name = "精美款式"
        accessory_url = None

        if task.accessory_source == "preset" and task.accessory_id:
            accessory = db.query(PresetAccessory).filter_by(id=task.accessory_id).first()
            if accessory:
                accessory_name = accessory.name
                accessory_url = accessory.image_url
        elif task.accessory_url:
            accessory_url = task.accessory_url

        return accessory_name, accessory_url

    def _resolve_scene_template(self, db: Session, task: GenerationTask) -> str:
        scene_template = "简约背景"
        if task.scene_id:
            scene = db.query(PresetScene).filter_by(id=task.scene_id).first()
            if scene and scene.prompt_template:
                scene_template = scene.prompt_template
        return scene_template

    def _resolve_model_url(self, db: Session, task: GenerationTask) -> Optional[str]:
        model_url = task.model_url
        if task.model_source == "preset" and task.model_id:
            model = db.query(PresetModel).filter_by(id=task.model_id).first()
            if model:
                model_url = model.image_url
        return model_url

    def _build_generation_prompt(
        self,
        generation_model: Optional[str],
        accessory_type: str,
        accessory_name: str,
        scene_template: str,
        lighting: str,
    ) -> str:
        if generation_model != QWEN_IMAGE_MODEL:
            return self.ai_service.build_prompt(
                accessory_type,
                accessory_name,
                scene_template,
                lighting
            )

        type_names = {
            "bracelet": "手绳",
            "necklace": "项链",
            "earring": "耳饰",
            "ring": "戒指"
        }
        lighting_desc = {
            "natural": "自然光，柔和明亮",
            "warm": "暖色调，温馨浪漫",
            "cool": "冷色调，时尚高级"
        }
        accessory_type_name = type_names.get(accessory_type, "配饰")
        lighting_text = lighting_desc.get(lighting, lighting_desc["natural"])

        return f"""使用图一作为模特/手部底图，请保持图一的手型、手指、皮肤纹理、姿势、构图、背景和光线尽量不变。
将图二中的{accessory_type_name}原样佩戴到图一手腕位置，图二{accessory_type_name}就是最终要佩戴的实物参考。
{accessory_type_name}的款式是：{accessory_name}。
场景：{scene_template}。
光线：{lighting_text}。
必须尽量保持图二{accessory_type_name}的原始款式、编织结构、珠子/吊坠形状、材质、颜色、纹理和细节，不要重新设计、不要美化改款、不要简化、不要替换成其他手链、不要生成额外饰品。
{accessory_type_name}必须像真实饰品一样环绕并贴合手腕，有合理的前后遮挡、阴影和高光；只能做必要的缩放、透视弯曲、遮挡和光影融合。
不要让{accessory_type_name}漂浮在皮肤上方，不要像贴纸一样平铺，不要和手腕分离。""".strip()

    def _execute_task(self, task_id: str):
        db = SessionLocal()
        try:
            task_options = self._get_task_options(task_id)

            custom_prompt = (task_options.get("prompt") or "").strip()
            negative_prompt = (task_options.get("negative_prompt") or "").strip()
            requested_model = task_options.get("model")
            generation_model = None
            if settings.ai_provider == "bailian":
                generation_model = requested_model or settings.bailian_model
            strength = task_options.get("strength", 0.75)
            guidance_scale = task_options.get("guidance_scale", 7.5)

            task = db.query(GenerationTask).filter_by(id=task_id).first()
            if not task:
                return

            task.status = TaskStatus.PROCESSING
            db.commit()
            self._update_task_info(task_id, status="processing", progress=10)

            accessory_name, accessory_url = self._resolve_accessory(db, task)
            self._update_task_info(task_id, progress=30)

            scene_template = self._resolve_scene_template(db, task)
            self._update_task_info(task_id, progress=50)

            prompt = self._build_generation_prompt(
                generation_model,
                task.accessory_type,
                accessory_name,
                scene_template,
                task.lighting
            )
            if custom_prompt:
                prompt = f"{prompt}\n用户补充要求：{custom_prompt}"
            if generation_model == QWEN_IMAGE_MODEL:
                logger.info("任务 %s 使用 Qwen-Image 图像编辑 prompt，输入模特图和配饰图", task_id)
            logger.debug("[AI Prompt][%s][%s]\n%s", task_id, generation_model, prompt)
            task.prompt = prompt
            db.commit()

            self._update_task_info(task_id, progress=70)

            model_url = self._resolve_model_url(db, task)
            image_data = self.ai_service.generate_image(
                base_image_url=model_url,
                accessory_image_url=accessory_url,
                prompt=prompt,
                negative_prompt=negative_prompt,
                strength=strength,
                guidance_scale=guidance_scale,
                model=generation_model
            )

            result_url = self.storage.save_result(image_data, task_id)

            task.status = TaskStatus.COMPLETED
            task.result_image_url = result_url
            db.commit()

            self._update_task_info(
                task_id,
                status="completed",
                progress=100,
                result_url=result_url
            )
        except Exception as e:
            logger.exception("任务 %s 失败", task_id)
            task = db.query(GenerationTask).filter_by(id=task_id).first()
            if task:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
                db.commit()
            self._update_task_info(task_id, status="failed", error=str(e))
        finally:
            db.close()


_task_queue_instance: Optional[TaskQueue] = None


def get_task_queue() -> TaskQueue:
    global _task_queue_instance
    if _task_queue_instance is None:
        _task_queue_instance = TaskQueue()
    return _task_queue_instance
