from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import os

from app.config import get_settings
from app.database import init_db, reset_stuck_tasks
from app.core import init_data
from app.api import presets, upload, generate
from app.services.rate_limiter import limiter

settings = get_settings()

app = FastAPI(title=settings.app_name, docs_url="/docs")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.result_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.mount("/results", StaticFiles(directory=settings.result_dir), name="results")

app.include_router(presets.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(generate.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    init_db()
    reset_stuck_tasks()
    init_data.ensure_initial_data()


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "ai_provider": settings.ai_provider
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
