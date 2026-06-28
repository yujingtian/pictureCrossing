from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import RecommendationImage
from app.schemas import ApiResponse, RecommendationResponse

router = APIRouter(prefix="/presets", tags=["预设资源"])


@router.get("/recommendations", response_model=ApiResponse[list[RecommendationResponse]])
def get_recommendations(
    target_type: Optional[str] = Query(None, description="推荐图目标类型: accessory 或 model"),
    target_value: Optional[str] = Query(None, description="推荐图目标值: 配饰类型或模特分类"),
    db: Session = Depends(get_db)
):
    """获取推荐图列表"""
    query = db.query(RecommendationImage).filter(
        RecommendationImage.is_active,
        RecommendationImage.deleted_at.is_(None)
    )
    if target_type:
        query = query.filter(RecommendationImage.target_type == target_type)
    if target_value:
        query = query.filter(RecommendationImage.target_value == target_value)
    recommendations = query.order_by(RecommendationImage.sort_order).all()
    return ApiResponse(success=True, data=[RecommendationResponse.model_validate(r) for r in recommendations])


@router.get("/scenes", response_model=ApiResponse)
def get_scenes(
    db: Session = Depends(get_db)
):
    """获取场景（已废弃，保留接口兼容）"""
    return ApiResponse(success=True, data=[])
