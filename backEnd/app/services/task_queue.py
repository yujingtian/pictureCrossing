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
                    "strength": options.get("strength", 0.75),
                    "guidance_scale": options.get("guidance_scale", 7.5),
                }
            }

        return task_id

    def _update_task_info(self, task_id: str, **kwargs):
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id].update(kwargs)

    def get_task_status(self, task_id: str) -> dict:
        with self.lock:
            if task_id in self.tasks:
                info = self.tasks[task_id].copy()
                info["task_id"] = task_id
                return info
        return {"task_id": task_id, "status": "not_found"}

    def _execute_task(self, task_id: str):
        db = SessionLocal()
        try:
            with self.lock:
                task_options = self.tasks.get(task_id, {}).get("options", {}).copy()

            custom_prompt = (task_options.get("prompt") or "").strip()
            strength = task_options.get("strength", 0.75)
            guidance_scale = task_options.get("guidance_scale", 7.5)

            task = db.query(GenerationTask).filter_by(id=task_id).first()
            if not task:
                return

            task.status = TaskStatus.PROCESSING
            db.commit()
            self._update_task_info(task_id, status="processing", progress=10)

            accessory_name = "精美款式"
            accessory_url = None
            if task.accessory_source == "preset" and task.accessory_id:
                acc = db.query(PresetAccessory).filter_by(id=task.accessory_id).first()
                if acc:
                    accessory_name = acc.name
                    accessory_url = acc.image_url
            elif task.accessory_url:
                accessory_url = task.accessory_url

            self._update_task_info(task_id, progress=30)

            scene_template = "简约背景"
            if task.scene_id:
                scene = db.query(PresetScene).filter_by(id=task.scene_id).first()
                if scene and scene.prompt_template:
                    scene_template = scene.prompt_template

            self._update_task_info(task_id, progress=50)

            prompt = self.ai_service.build_prompt(
                task.accessory_type,
                accessory_name,
                scene_template,
                task.lighting
            )
            if custom_prompt:
                prompt = f"{prompt}\n用户补充要求：{custom_prompt}"
            print(f"[AI Prompt][{task_id}]\n{prompt}\n")
            task.prompt = prompt
            db.commit()

            self._update_task_info(task_id, progress=70)

            model_url = task.model_url
            if task.model_source == "preset" and task.model_id:
                model = db.query(PresetModel).filter_by(id=task.model_id).first()
                if model:
                    model_url = model.image_url

            image_data = self.ai_service.generate_image(
                base_image_url=model_url,
                accessory_image_url=accessory_url,
                prompt=prompt,
                strength=strength,
                guidance_scale=guidance_scale
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
            print(f"任务 {task_id} 失败: {e}")
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
