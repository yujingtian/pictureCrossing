import base64
from typing import Optional

import requests

from app.config import get_settings
from app.services.ai.base import BaseAIService

settings = get_settings()


class StableDiffusionAIService(BaseAIService):
    """本地 Stable Diffusion WebUI 服务"""

    def __init__(self):
        self.api_url = settings.stable_diffusion_api_url.rstrip("/")

    def _download_image(self, url: str) -> bytes:
        if url.startswith("http"):
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content

        with open(f".{url}" if url.startswith("/") else url, "rb") as f:
            return f.read()

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75,
        guidance_scale: float = 7.5,
    ) -> bytes:
        base_image_data = self._download_image(base_image_url)
        base64_image = base64.b64encode(base_image_data).decode()

        payload = {
            "init_images": [base64_image],
            "prompt": prompt,
            "negative_prompt": negative_prompt or "ugly, blurry, low quality",
            "denoising_strength": strength,
            "cfg_scale": guidance_scale,
            "width": 512,
            "height": 640,
            "sampler_name": "Euler a",
            "steps": 20
        }

        try:
            response = requests.post(
                f"{self.api_url}/sdapi/v1/img2img",
                json=payload,
                timeout=120
            )
            response.raise_for_status()
            result = response.json()
            image_b64 = result["images"][0]
            return base64.b64decode(image_b64)
        except Exception as e:
            raise RuntimeError(f"Stable Diffusion API 调用失败: {e}")
