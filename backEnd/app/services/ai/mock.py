import os
from io import BytesIO
from typing import Optional

from PIL import Image

from app.services.ai.base import BaseAIService


class MockAIService(BaseAIService):
    """模拟 AI 服务，用于开发调试"""

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75,
        guidance_scale: float = 7.5,
        model: Optional[str] = None,
    ) -> bytes:
        print(f"[Mock AI] 图生图生成")
        print(f"Prompt: {prompt[:50]}...")

        placeholder_path = "data/placeholder.jpg"
        if os.path.exists(placeholder_path):
            with open(placeholder_path, "rb") as f:
                return f.read()

        img = Image.new('RGB', (512, 640), color=(245, 235, 220))
        buf = BytesIO()
        img.save(buf, format='JPEG')
        return buf.getvalue()
