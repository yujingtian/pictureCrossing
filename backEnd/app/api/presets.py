from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import PresetAccessory, PresetModel, PresetScene, RecommendationImage
from app.schemas import AccessoryResponse, ModelResponse, SceneResponse, ApiResponse, RecommendationResponse

router = APIRouter(prefix="/presets", tags=["预设资源"])


@router.get("/accessories", response_model=ApiResponse)
def get_accessories(
    type: Optional[str] = Query(None, description="配饰类型: bracelet（目前仅支持手绳）"),
    db: Session = Depends(get_db)
):
    query = db.query(PresetAccessory)
    if type:
        query = query.filter(PresetAccessory.type == type)
    accessories = query.order_by(PresetAccessory.sort_order).all()
    data = [AccessoryResponse.model_validate(a).model_dump() for a in accessories]
    return ApiResponse(success=True, data=data)


@router.get("/models", response_model=ApiResponse)
def get_models(
    category: Optional[str] = Query(None, description="模特分类"),
    db: Session = Depends(get_db)
):
    query = db.query(PresetModel)
    if category and category != "all":
        query = query.filter(PresetModel.category == category)
    models = query.order_by(PresetModel.sort_order).all()
    data = [ModelResponse.model_validate(m).model_dump() for m in models]
    return ApiResponse(success=True, data=data)


@router.get("/scenes", response_model=ApiResponse)
def get_scenes(
    category: Optional[str] = Query(None, description="场景分类"),
    db: Session = Depends(get_db)
):
    query = db.query(PresetScene)
    if category:
        query = query.filter(PresetScene.category == category)
    scenes = query.order_by(PresetScene.sort_order).all()
    data = [SceneResponse.model_validate(s).model_dump() for s in scenes]
    return ApiResponse(success=True, data=data)


@router.get("/recommendations", response_model=ApiResponse[list[RecommendationResponse]])
def get_recommendations(
    position: Optional[str] = Query("home", description="展示位置"),
    db: Session = Depends(get_db)
):
    """获取前台展示的推荐图"""
    query = db.query(RecommendationImage).filter(RecommendationImage.is_active)
    if position:
        query = query.filter(RecommendationImage.position == position)
    recommendations = query.order_by(RecommendationImage.sort_order).all()
    return ApiResponse(success=True, data=[RecommendationResponse.model_validate(r) for r in recommendations])
