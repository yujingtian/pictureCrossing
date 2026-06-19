from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CreateGenerationRequest, ApiResponse
from app.services.task_queue import get_task_queue
from app.services.rate_limiter import get_rate_limiter, get_rate_limit_string
from app.models import User
from app.dependencies import get_current_active_user, get_optional_user
from app.api.auth import get_client_ip, log_audit

router = APIRouter(prefix="/generate", tags=["AI 生成"])
limiter = get_rate_limiter()
rate_limit_str = get_rate_limit_string()


@router.post("", response_model=ApiResponse)
@limiter.limit(rate_limit_str)
def create_generation(
    request: Request,
    req: CreateGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建生成任务（需要登录）"""
    # 在事务中处理配额扣减
    with db.begin_nested():
        # 悲观锁，防止并发超扣
        locked_user = db.query(User).filter(User.id == current_user.id).with_for_update().first()

        if locked_user.quota_used >= locked_user.quota_total:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="配额不足，请联系管理员")

        # 扣减配额
        locked_user.quota_used += 1
        db.flush()

    # 创建任务
    task_queue = get_task_queue()
    task_id = task_queue.create_task(
        db=db,
        accessory_type=req.accessory_type,
        accessory=req.accessory.model_dump(),
        model=req.model.model_dump(),
        scene=req.scene.model_dump() if req.scene else None,
        options=req.options.model_dump() if req.options else None,
        user_id=current_user.id
    )

    # 记录审计日志
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    log_audit(db, current_user.id, "GENERATE_IMAGE",
              resource_type="task", resource_id=task_id,
              ip_address=ip_address, user_agent=user_agent)

    return ApiResponse(
        success=True,
        data={"task_id": task_id, "status": "pending"}
    )


@router.get("/{task_id}", response_model=ApiResponse)
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取任务状态（需要登录，只能查看自己的任务）"""
    task_queue = get_task_queue()
    status_data = task_queue.get_task_status(task_id, db=db)

    # 验证任务属于当前用户
    from app.models import GenerationTask
    task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
    if task and task.user_id and task.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权查看此任务")

    return ApiResponse(success=True, data=status_data)
