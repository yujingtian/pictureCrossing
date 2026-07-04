from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Literal
import json

from app.database import get_db
from app.models import User, RecommendationImage, GenerationTask, UserRole
from app.schemas import (
    ApiResponse, AdminStatsResponse,
    UserListParams, PaginatedResponse, AdminUserResponse,
    AdminUserCreateRequest, AdminUserUpdateRequest, AdminUserQuotaUpdateRequest,
    RecommendationListParams, RecommendationCreateRequest, RecommendationUpdateRequest, RecommendationResponse
)
from app.dependencies import get_current_admin_user
from app.core.security import get_password_hash, check_password_history, save_password_to_history
from app.api.auth import log_audit

router = APIRouter(tags=["管理后台"])


@router.get("/stats", response_model=ApiResponse[AdminStatsResponse])
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """获取统计数据"""
    total_users = db.query(User).count()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_users_today = db.query(User).filter(User.last_activity_at >= today_start).count()

    total_generations = db.query(GenerationTask).count()
    generations_today = db.query(GenerationTask).filter(GenerationTask.created_at >= today_start).count()

    all_quota = db.query(User).with_entities(User.quota_total, User.quota_used).all()
    total_quota = sum(q for q, u in all_quota)
    total_used = sum(u for q, u in all_quota)
    quota_usage_rate = round(total_used / total_quota * 100, 2) if total_quota > 0 else 0

    return ApiResponse(data=AdminStatsResponse(
        total_users=total_users,
        active_users_today=active_users_today,
        total_generations=total_generations,
        generations_today=generations_today,
        quota_usage_rate=quota_usage_rate
    ))


@router.get("/users", response_model=ApiResponse[PaginatedResponse[AdminUserResponse]])
def get_users(
    params: UserListParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """获取用户列表"""
    query = db.query(User)

    if params.search:
        search_term = f"%{params.search}%"
        query = query.filter(
            (User.username.ilike(search_term)) | (User.email.ilike(search_term))
        )

    if params.role:
        query = query.filter(User.role == params.role)

    if params.is_active is not None:
        query = query.filter(User.is_active == params.is_active)

    # 排序
    if params.sort_by == "created_at":
        if params.sort_order == "asc":
            query = query.order_by(User.created_at.asc())
        else:
            query = query.order_by(User.created_at.desc())
    else:
        query = query.order_by(User.created_at.desc())

    total = query.count()
    offset = (params.page - 1) * params.page_size
    items = query.offset(offset).limit(params.page_size).all()

    return ApiResponse(data=PaginatedResponse(
        items=[AdminUserResponse.model_validate(u) for u in items],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=(total + params.page_size - 1) // params.page_size
    ))


@router.get("/users/{user_id}", response_model=ApiResponse[AdminUserResponse])
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """获取用户详情"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    return ApiResponse(data=AdminUserResponse.model_validate(user))


@router.post("/users", response_model=ApiResponse[AdminUserResponse])
def create_user(
    req: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """创建用户"""
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已被使用")

    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邮箱已被使用")

    hashed_pwd = get_password_hash(req.password)
    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hashed_pwd,
        role=UserRole(req.role),
        quota_total=req.quota_total,
        quota_used=0,
        is_active=req.is_active,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    save_password_to_history(db, user.id, hashed_pwd)

    log_audit(db, current_user.id, "CREATE_USER",
              resource_type="user", resource_id=user.id,
              new_value=json.dumps({"username": user.username, "email": user.email}))

    return ApiResponse(data=AdminUserResponse.model_validate(user), message="创建成功")


@router.put("/users/{user_id}", response_model=ApiResponse[AdminUserResponse])
def update_user(
    user_id: str,
    req: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """更新用户"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    old_value = json.dumps({"username": user.username, "email": user.email, "role": user.role, "is_active": user.is_active})

    if req.username and req.username != user.username:
        if db.query(User).filter(User.username == req.username).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已被使用")
        user.username = req.username

    if req.email and req.email != user.email:
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邮箱已被使用")
        user.email = req.email
        user.email_verified = False

    if req.role is not None:
        user.role = UserRole(req.role)

    if req.is_active is not None:
        user.is_active = req.is_active
        if not req.is_active:
            from app.core.auth import revoke_all_user_tokens
            revoke_all_user_tokens(db, user.id)

    db.commit()
    db.refresh(user)

    new_value = json.dumps({"username": user.username, "email": user.email, "role": user.role, "is_active": user.is_active})
    log_audit(db, current_user.id, "UPDATE_USER",
              resource_type="user", resource_id=user.id,
              old_value=old_value, new_value=new_value)

    return ApiResponse(data=AdminUserResponse.model_validate(user), message="更新成功")


@router.put("/users/{user_id}/quota", response_model=ApiResponse[AdminUserResponse])
def update_user_quota(
    user_id: str,
    req: AdminUserQuotaUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """调整用户配额"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    old_value = json.dumps({"quota_total": user.quota_total})
    user.quota_total = req.quota_total
    db.commit()
    db.refresh(user)

    new_value = json.dumps({"quota_total": user.quota_total})
    log_audit(db, current_user.id, "UPDATE_QUOTA",
              resource_type="user", resource_id=user.id,
              old_value=old_value, new_value=new_value)

    return ApiResponse(data=AdminUserResponse.model_validate(user), message="配额已更新")


@router.put("/users/{user_id}/toggle-active", response_model=ApiResponse[AdminUserResponse])
def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """启用/禁用用户"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能禁用自己")

    user.is_active = not user.is_active

    if not user.is_active:
        from app.core.auth import revoke_all_user_tokens
        revoke_all_user_tokens(db, user.id)

    db.commit()
    db.refresh(user)

    log_audit(db, current_user.id, "TOGGLE_USER_ACTIVE",
              resource_type="user", resource_id=user.id,
              new_value=json.dumps({"is_active": user.is_active}))

    return ApiResponse(data=AdminUserResponse.model_validate(user), message="状态已更新")


@router.get("/recommendations", response_model=ApiResponse[PaginatedResponse[RecommendationResponse]])
def get_recommendations(
    page: int = 1,
    page_size: int = 20,
    target_type: Optional[str] = None,
    target_value: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: Literal["asc", "desc"] = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """获取推荐图列表"""
    query = db.query(RecommendationImage).filter(RecommendationImage.deleted_at.is_(None))

    if target_type:
        query = query.filter(RecommendationImage.target_type == target_type)

    if target_value:
        query = query.filter(RecommendationImage.target_value == target_value)

    if is_active is not None:
        query = query.filter(RecommendationImage.is_active == is_active)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (RecommendationImage.title.ilike(search_term)) | (RecommendationImage.description.ilike(search_term))
        )

    query = query.order_by(RecommendationImage.sort_order.asc(), RecommendationImage.created_at.desc())

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return ApiResponse(data=PaginatedResponse(
        items=[RecommendationResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    ))


@router.get("/recommendations/{rec_id}", response_model=ApiResponse[RecommendationResponse])
def get_recommendation(
    rec_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """获取推荐图详情"""
    rec = db.query(RecommendationImage).filter(RecommendationImage.id == rec_id).first()
    if not rec or rec.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="推荐图不存在")

    return ApiResponse(data=RecommendationResponse.model_validate(rec))


@router.post("/recommendations", response_model=ApiResponse[RecommendationResponse])
def create_recommendation(
    req: RecommendationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """创建推荐图"""
    rec = RecommendationImage(
        title=req.title,
        description=req.description,
        image_url=req.image_url,
        target_type=req.target_type,
        target_value=req.target_value,
        sort_order=req.sort_order,
        is_active=req.is_active
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    log_audit(db, current_user.id, "CREATE_RECOMMENDATION",
              resource_type="recommendation", resource_id=rec.id,
              new_value=json.dumps({"title": rec.title}))

    return ApiResponse(data=RecommendationResponse.model_validate(rec), message="创建成功")


@router.put("/recommendations/{rec_id}", response_model=ApiResponse[RecommendationResponse])
def update_recommendation(
    rec_id: str,
    req: RecommendationUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """更新推荐图"""
    rec = db.query(RecommendationImage).filter(RecommendationImage.id == rec_id).first()
    if not rec or rec.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="推荐图不存在")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rec, field, value)

    db.commit()
    db.refresh(rec)

    log_audit(db, current_user.id, "UPDATE_RECOMMENDATION",
              resource_type="recommendation", resource_id=rec.id)

    return ApiResponse(data=RecommendationResponse.model_validate(rec), message="更新成功")


@router.delete("/recommendations/{rec_id}", response_model=ApiResponse)
def delete_recommendation(
    rec_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """删除推荐图（软删除）"""
    rec = db.query(RecommendationImage).filter(RecommendationImage.id == rec_id).first()
    if not rec or rec.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="推荐图不存在")

    rec.deleted_at = datetime.utcnow()
    db.commit()

    log_audit(db, current_user.id, "DELETE_RECOMMENDATION",
              resource_type="recommendation", resource_id=rec.id)

    return ApiResponse(message="删除成功")
