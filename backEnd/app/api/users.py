from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import User, GenerationTask
from app.schemas import (
    ApiResponse, QuotaResponse,
    TaskHistoryParams, PaginatedResponse, TaskHistoryItem
)
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/api/users", tags=["用户"])


@router.get("/quota", response_model=ApiResponse[QuotaResponse])
def get_quota(current_user: User = Depends(get_current_active_user)):
    """获取当前用户配额"""
    return ApiResponse(
        data=QuotaResponse(
            quota_total=current_user.quota_total,
            quota_used=current_user.quota_used,
            quota_remaining=current_user.quota_total - current_user.quota_used
        )
    )


@router.get("/history", response_model=ApiResponse[PaginatedResponse[TaskHistoryItem]])
def get_task_history(params: TaskHistoryParams = Depends(), db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    """获取生成历史"""
    query = db.query(GenerationTask).filter(GenerationTask.user_id == current_user.id)

    if params.status:
        query = query.filter(GenerationTask.status == params.status)

    if params.accessory_type:
        query = query.filter(GenerationTask.accessory_type == params.accessory_type)

    if params.date_from:
        query = query.filter(GenerationTask.created_at >= params.date_from)

    if params.date_to:
        query = query.filter(GenerationTask.created_at <= params.date_to)

    # 排序
    order_col = GenerationTask.created_at.desc()
    if params.sort_by == "created_at" and params.sort_order == "asc":
        order_col = GenerationTask.created_at.asc()

    query = query.order_by(order_col)

    # 分页
    total = query.count()
    offset = (params.page - 1) * params.page_size
    items = query.offset(offset).limit(params.page_size).all()

    return ApiResponse(
        data=PaginatedResponse(
            items=[TaskHistoryItem.model_validate(i) for i in items],
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=(total + params.page_size - 1) // params.page_size
        )
    )
