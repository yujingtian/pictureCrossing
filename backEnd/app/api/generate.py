from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CreateGenerationRequest, ApiResponse
from app.services.task_queue import get_task_queue
from app.services.rate_limiter import get_rate_limiter, get_rate_limit_string

router = APIRouter(prefix="/generate", tags=["AI 生成"])
limiter = get_rate_limiter()
rate_limit_str = get_rate_limit_string()


@router.post("", response_model=ApiResponse)
@limiter.limit(rate_limit_str)
def create_generation(
    request: Request,
    req: CreateGenerationRequest,
    db: Session = Depends(get_db)
):
    task_queue = get_task_queue()
    task_id = task_queue.create_task(
        db=db,
        accessory_type=req.accessory_type,
        accessory=req.accessory.model_dump(),
        model=req.model.model_dump(),
        scene=req.scene.model_dump() if req.scene else None,
        options=req.options.model_dump() if req.options else None
    )
    return ApiResponse(
        success=True,
        data={"task_id": task_id, "status": "pending"}
    )


@router.get("/{task_id}", response_model=ApiResponse)
def get_task_status(task_id: str):
    task_queue = get_task_queue()
    status = task_queue.get_task_status(task_id)
    return ApiResponse(success=True, data=status)
