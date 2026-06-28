from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import RecommendationImage
from app.schemas import ApiResponse, RecommendationResponse

router = APIRouter(prefix="/presets", tags=["预设资源"])


@router.get("/accessories", response_model=ApiResponse[list[RecommendationResponse]])
def get_accessories(
    db: Session = Depends(get_db)
):
    """获取配饰推荐图"""
    query = db.query(RecommendationImage).filter(
        RecommendationImage.is_active,
        RecommendationImage.type == "accessory"
    )
    recommendations = query.order_by(RecommendationImage.sort_order).all()
    return ApiResponse(success=True, data=[RecommendationResponse.model_validate(r) for r in recommendations])


@router.get("/models", response_model=ApiResponse[list[RecommendationResponse]])
def get_models(
    db: Session = Depends(get_db)
):
    """获取模特推荐图"""
    query = db.query(RecommendationImage).filter(
        RecommendationImage.is_active,
        RecommendationImage.type == "model"
    )
    recommendations = query.order_by(RecommendationImage.sort_order).all()
    return ApiResponse(success=True, data=[RecommendationResponse.model_validate(r) for r in recommendations])


@router.get("/scenes", response_model=ApiResponse)
def get_scenes(
    db: Session = Depends(get_db)
):
    """获取场景（已废弃，保留接口兼容）"""
    return ApiResponse(success=True, data=[])


@router.get("/recommendations", response_model=ApiResponse[list[RecommendationResponse]])
def get_recommendations(
    type: Optional[str] = Query(None, description="推荐图类型: accessory 或 model"),
    db: Session = Depends(get_db)
):
    """获取前台展示的推荐图"""
    query = db.query(RecommendationImage).filter(RecommendationImage.is_active)
    if type:
        query = query.filter(RecommendationImage.type == type)
    recommendations = query.order_by(RecommendationImage.sort_order).all()
    return ApiResponse(success=True, data=[RecommendationResponse.model_validate(r) for r in recommendations])
