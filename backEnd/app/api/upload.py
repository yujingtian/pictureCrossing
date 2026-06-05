from fastapi import APIRouter, UploadFile, File, Query
from app.schemas import ApiResponse
from app.services.storage import get_storage_service

router = APIRouter(prefix="/upload", tags=["文件上传"])
storage = get_storage_service()


@router.post("", response_model=ApiResponse)
async def upload_file(
    file: UploadFile = File(...),
    type: str = Query(..., description="上传类型: accessory/model/mask")
):
    result = await storage.save_upload(file, type)
    return ApiResponse(success=True, data=result)
