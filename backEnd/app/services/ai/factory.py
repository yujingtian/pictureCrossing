from app.config import get_settings
from app.services.ai.base import BaseAIService
from app.services.ai.bailian import BailianAIService
from app.services.ai.mock import MockAIService
from app.services.ai.stable_diffusion import StableDiffusionAIService

settings = get_settings()


def get_ai_service() -> BaseAIService:
    provider = settings.ai_provider
    if provider == "stable_diffusion":
        return StableDiffusionAIService()
    if provider == "bailian":
        return BailianAIService()
    return MockAIService()
