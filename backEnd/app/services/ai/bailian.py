import base64
import logging
from io import BytesIO
from typing import Optional

import requests
from PIL import Image, ImageOps

from app.config import get_settings
from app.services.ai.base import BaseAIService

settings = get_settings()
logger = logging.getLogger(__name__)

WAN_IMAGE_MODEL = "wan2.7-image-pro"
QWEN_IMAGE_MODEL = "qwen-image-2.0-pro"


class BailianAIService(BaseAIService):
    """阿里百炼图像生成同步调用服务"""

    def __init__(self):
        if not settings.bailian_api_key:
            raise RuntimeError("请配置 BAILIAN_API_KEY")
        self.api_key = settings.bailian_api_key
        self.model = settings.bailian_model
        self.base_url = settings.bailian_base_url

    def _download_image(self, url: str) -> bytes:
        if url.startswith("http"):
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content

        if url.startswith("file://"):
            local_path = url.replace("file://", "", 1)
        else:
            local_path = f".{url}" if url.startswith("/") else url

        with open(local_path, "rb") as f:
            return f.read()

    def _image_data_to_data_url(self, image_data: bytes) -> str:
        """保持原始图片格式，转成文档支持的 data:{MIME_type};base64,{base64_data} 格式"""
        with Image.open(BytesIO(image_data)) as img:
            image_format = (img.format or "").lower()
            mime_types = {
                "jpeg": "image/jpeg",
                "jpg": "image/jpeg",
                "png": "image/png",
                "bmp": "image/bmp",
                "webp": "image/webp",
            }
            mime_type = mime_types.get(image_format)

            img = ImageOps.exif_transpose(img)
            width, height = img.size
            if width < 240 or height < 240 or width > 8000 or height > 8000:
                raise RuntimeError(
                    f"图片尺寸不符合百炼要求: {width}x{height}，宽高需在 240-8000 像素之间"
                )

            if image_format in ("jpeg", "jpg", "mpo"):
                # 重新保存 JPEG，烘焙 EXIF 方向；MPO 取首帧转 JPEG。
                if image_format == "mpo":
                    img.seek(0)
                    img = ImageOps.exif_transpose(img)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                buf = BytesIO()
                img.save(buf, format="JPEG", quality=95)
                image_data = buf.getvalue()
                mime_type = "image/jpeg"
            elif mime_type:
                # PNG/BMP/WEBP 等格式如带方向信息，也保存一次把方向应用到像素里。
                buf = BytesIO()
                save_format = "PNG" if image_format == "png" else image_format.upper()
                img.save(buf, format=save_format)
                image_data = buf.getvalue()
            else:
                raise RuntimeError(f"百炼不支持的图片格式: {img.format}")

        encoded = base64.b64encode(image_data).decode("utf-8")
        return f"data:{mime_type};base64,{encoded}"

    def _build_messages(self, prompt: str, base_image_url: str, accessory_image_url: Optional[str]):
        try:
            from dashscope.api_entities.dashscope_response import Message
        except ImportError:
            raise RuntimeError("请安装 dashscope>=1.25.15: pip install -U dashscope")

        base_image = self._image_data_to_data_url(self._download_image(base_image_url))

        content = [
            {"image": base_image},
        ]

        if accessory_image_url:
            accessory_image = self._image_data_to_data_url(
                self._download_image(accessory_image_url)
            )
            content.append({"image": accessory_image})

        content.append({"text": prompt})

        return [Message(role="user", content=content)]

    def _extract_result_url(self, resp) -> str:
        choices = getattr(resp.output, "choices", None) if resp.output else None
        if not choices:
            raise RuntimeError("百炼 API 未返回结果")

        for choice in choices:
            message = choice.get("message") if isinstance(choice, dict) else getattr(choice, "message", None)
            if not message:
                continue

            content_list = message.get("content") if isinstance(message, dict) else getattr(message, "content", None)
            if not content_list:
                continue

            for content in content_list:
                if isinstance(content, dict) and content.get("image"):
                    return content["image"]

        raise RuntimeError("百炼 API 返回结果中未找到图片 URL")

    def _download_result_image(self, result_url: str) -> bytes:
        try:
            image_response = requests.get(result_url, timeout=60)
            image_response.raise_for_status()
            return image_response.content
        except Exception as e:
            raise RuntimeError(f"下载生成结果失败: {e}")

    def _generate_wan_image(
        self,
        model: str,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
    ) -> bytes:
        try:
            import dashscope
            from dashscope.aigc.image_generation import ImageGeneration
        except ImportError:
            raise RuntimeError("请安装 dashscope>=1.25.15: pip install -U dashscope")

        dashscope.base_http_api_url = self.base_url
        messages = self._build_messages(prompt, base_image_url, accessory_image_url)

        try:
            resp = ImageGeneration.call(
                model=model,
                api_key=self.api_key,
                messages=messages,
                watermark=False,
                n=1,
                size="2K",
            )
        except Exception as e:
            raise RuntimeError(f"百炼 Wan-Image API 调用异常: {e}")

        if resp.status_code != 200:
            raise RuntimeError(
                f"百炼 Wan-Image API 调用失败: status_code={resp.status_code}, "
                f"code={getattr(resp, 'code', '')}, message={getattr(resp, 'message', '')}, "
                f"request_id={getattr(resp, 'request_id', '')}"
            )

        return self._download_result_image(self._extract_result_url(resp))

    def _generate_qwen_image(
        self,
        model: str,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
        negative_prompt: str = "",
    ) -> bytes:
        if not base_image_url:
            raise RuntimeError("Qwen-Image 图像编辑需要提供模特/手部图")
        if not accessory_image_url:
            raise RuntimeError("Qwen-Image 图像编辑需要提供配饰图")

        try:
            import dashscope
            from dashscope import MultiModalConversation
        except ImportError:
            raise RuntimeError("请安装 dashscope>=1.25.15: pip install -U dashscope")

        dashscope.base_http_api_url = self.base_url
        base_image = self._image_data_to_data_url(self._download_image(base_image_url))
        accessory_image = self._image_data_to_data_url(
            self._download_image(accessory_image_url)
        )
        messages = [
            {
                "role": "user",
                "content": [
                    {"image": base_image},
                    {"image": accessory_image},
                    {"text": prompt},
                ],
            }
        ]

        try:
            resp = MultiModalConversation.call(
                model=model,
                api_key=self.api_key,
                messages=messages,
                stream=False,
                n=1,
                watermark=False,
                prompt_extend=True,
                negative_prompt=negative_prompt or " ",
                size="2048*2048",
            )
        except Exception as e:
            raise RuntimeError(f"百炼 Qwen-Image API 调用异常: {e}")

        if resp.status_code != 200:
            raise RuntimeError(
                f"百炼 Qwen-Image API 调用失败: status_code={resp.status_code}, "
                f"code={getattr(resp, 'code', '')}, message={getattr(resp, 'message', '')}, "
                f"request_id={getattr(resp, 'request_id', '')}"
            )

        return self._download_result_image(self._extract_result_url(resp))

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
        selected_model = model or self.model

        if selected_model == QWEN_IMAGE_MODEL:
            logger.info("使用 Qwen-Image 图像编辑同步调用，输入模特图和配饰图")
            return self._generate_qwen_image(
                model=selected_model,
                base_image_url=base_image_url,
                accessory_image_url=accessory_image_url,
                prompt=prompt,
                negative_prompt=negative_prompt,
            )

        if selected_model == WAN_IMAGE_MODEL:
            return self._generate_wan_image(
                model=selected_model,
                base_image_url=base_image_url,
                accessory_image_url=accessory_image_url,
                prompt=prompt,
            )

        raise RuntimeError(
            f"不支持的百炼模型: {selected_model}，仅支持 {WAN_IMAGE_MODEL} / {QWEN_IMAGE_MODEL}"
        )
