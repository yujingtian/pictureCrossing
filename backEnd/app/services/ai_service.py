import os
import base64
from io import BytesIO
from typing import Optional

import requests
from PIL import Image

from app.config import get_settings

settings = get_settings()


class BaseAIService:
    """AI 服务基类"""

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        """
        图生图：基于基础图片（模特）和配饰图片，生成佩戴配饰后的效果图

        Args:
            base_image_url: 基础图片 URL（模特图）
            accessory_image_url: 配饰图片 URL（可选）
            prompt: 正向提示词
            negative_prompt: 反向提示词
            strength: 重绘强度 0.0-1.0

        Returns:
            生成图片的二进制数据
        """
        raise NotImplementedError()

    def build_prompt(
        self,
        accessory_type: str,
        accessory_name: str,
        scene_template: str,
        lighting: str
    ) -> str:
        type_names = {
            "bracelet": "手链",
            "necklace": "项链",
            "earring": "耳饰",
            "ring": "戒指"
        }
        lighting_desc = {
            "natural": "自然光，柔和明亮",
            "warm": "暖色调，温馨浪漫",
            "cool": "冷色调，时尚高级"
        }
        accessory_type_name = type_names.get(accessory_type, "配饰")
        lighting_text = lighting_desc.get(lighting, lighting_desc["natural"])

        return f"""高清晰度产品照片，展示佩戴{accessory_type_name}的效果。
{accessory_type_name}的款式是：{accessory_name}。
场景：{scene_template}。
光线：{lighting_text}。
要求：照片清晰、细节丰富、色彩真实、构图美观，具有商业摄影质感。
佩戴自然，贴合皮肤，真实感强。""".strip()


class MockAIService(BaseAIService):
    """模拟 AI 服务，用于开发调试"""

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        print(f"[Mock AI] 图生图生成")
        print(f"Prompt: {prompt[:50]}...")

        placeholder_path = "data/placeholder.jpg"
        if os.path.exists(placeholder_path):
            with open(placeholder_path, "rb") as f:
                return f.read()
        else:
            img = Image.new('RGB', (512, 640), color=(245, 235, 220))
            buf = BytesIO()
            img.save(buf, format='JPEG')
            return buf.getvalue()


class StableDiffusionAIService(BaseAIService):
    """本地 Stable Diffusion WebUI 服务"""

    def __init__(self):
        self.api_url = settings.stable_diffusion_api_url.rstrip("/")

    def _download_image(self, url: str) -> bytes:
        if url.startswith("http"):
            return requests.get(url, timeout=30).content
        else:
            with open(f".{url}" if url.startswith("/") else url, "rb") as f:
                return f.read()

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        base_image_data = self._download_image(base_image_url)
        base64_image = base64.b64encode(base_image_data).decode()

        payload = {
            "init_images": [base64_image],
            "prompt": prompt,
            "negative_prompt": negative_prompt or "ugly, blurry, low quality",
            "denoising_strength": strength,
            "cfg_scale": 7.5,
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


class BailianAIService(BaseAIService):
    """阿里百炼 Wan2.7-Image-Pro 图生图服务

    百炼 wanx 系列采用异步任务模式：
    1. 调用 async_call 创建任务
    2. 轮询 fetch 获取结果

    本实现使用 ImageSynthesis.call 同步接口（SDK 内部已封装轮询）。
    """

    def __init__(self):
        if not settings.bailian_api_key:
            raise RuntimeError("请配置 BAILIAN_API_KEY")
        self.api_key = settings.bailian_api_key
        self.model = settings.bailian_model

    def _resolve_image_url(self, url: str) -> str:
        """
        将图片 URL 解析为百炼可访问的形式：
        - 远程 URL：直接返回
        - 本地路径（/uploads/xxx）：拼接 public_base_url
          若未配置 public_base_url，则下载后转 base64 data URL
        """
        if url.startswith("http"):
            return url

        if settings.public_base_url:
            base = settings.public_base_url.rstrip("/")
            return f"{base}{url}" if url.startswith("/") else f"{base}/{url}"

        # 回退方案：转 base64 data URL
        local_path = f".{url}" if url.startswith("/") else url
        with open(local_path, "rb") as f:
            image_data = f.read()
        b64 = base64.b64encode(image_data).decode()
        # 简单根据扩展名推断 mime
        ext = os.path.splitext(local_path)[1].lower().lstrip(".")
        mime = f"image/{ext}" if ext in ("jpeg", "jpg", "png", "webp") else "image/jpeg"
        return f"data:{mime};base64,{b64}"

    def _download_image(self, url: str) -> bytes:
        if url.startswith("http"):
            return requests.get(url, timeout=30).content
        local_path = f".{url}" if url.startswith("/") else url
        with open(local_path, "rb") as f:
            return f.read()

    def _composite_reference_image(
        self,
        base_image_data: bytes,
        accessory_image_data: Optional[bytes]
    ) -> bytes:
        """
        将参考配饰图合成到基础图上作为参考
        把配饰图缩小后放在基础图右下角，提供视觉参考
        """
        with Image.open(BytesIO(base_image_data)) as base_img:
            if base_img.mode in ("RGBA", "P"):
                base_img = base_img.convert("RGB")

            base_width, base_height = base_img.size

            if accessory_image_data:
                try:
                    with Image.open(BytesIO(accessory_image_data)) as acc_img:
                        if acc_img.mode in ("RGBA", "P"):
                            acc_img = acc_img.convert("RGB")

                        # 配饰图缩放到基础图 1/4 大小
                        acc_size = min(base_width // 4, base_height // 4)
                        acc_img.thumbnail((acc_size, acc_size))

                        # 粘贴到右下角，留 10px 边距
                        paste_x = base_width - acc_img.width - 10
                        paste_y = base_height - acc_img.height - 10
                        base_img.paste(acc_img, (paste_x, paste_y))
                except Exception as e:
                    print(f"合成参考图失败: {e}")

            buf = BytesIO()
            base_img.save(buf, format='JPEG', quality=95)
            return buf.getvalue()

    def _save_temp_composite(self, image_data: bytes) -> str:
        """保存合成参考图到 results 目录并返回相对路径"""
        import uuid as _uuid
        os.makedirs(settings.result_dir, exist_ok=True)
        filename = f"ref_{_uuid.uuid4().hex[:12]}.jpg"
        filepath = os.path.join(settings.result_dir, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return f"/results/{filename}"

    def generate_image(
        self,
        base_image_url: str,
        accessory_image_url: Optional[str],
        prompt: str,
        negative_prompt: str = "",
        strength: float = 0.75
    ) -> bytes:
        try:
            import dashscope
            from dashscope import ImageSynthesis
        except ImportError:
            raise RuntimeError("请安装 dashscope: pip install dashscope")

        # 下载基础图（模特图）
        base_image_data = self._download_image(base_image_url)

        # 下载配饰图（如果有）
        accessory_image_data = None
        if accessory_image_url:
            try:
                accessory_image_data = self._download_image(accessory_image_url)
            except Exception as e:
                print(f"下载配饰图失败: {e}")

        # 合成参考图：模特图 + 配饰图叠加
        composite_image_data = self._composite_reference_image(
            base_image_data,
            accessory_image_data
        )

        # 将合成图保存为本地文件并解析为百炼可访问的 URL
        composite_local_url = self._save_temp_composite(composite_image_data)
        ref_image_url = self._resolve_image_url(composite_local_url)

        # 设置百炼 API Key
        dashscope.api_key = self.api_key

        # 参考强度：strength 越大重绘越多，ref_strength 越小越靠近参考图
        ref_strength = max(0.3, min(1.0, strength))

        try:
            resp = ImageSynthesis.call(
                model=self.model,
                prompt=prompt,
                negative_prompt=negative_prompt or "低质量, 模糊, 变形, 丑陋",
                size="1024*1280",
                n=1,
                ref_img=ref_image_url,
                ref_strength=ref_strength,
                ref_mode="repaint",
            )
        except Exception as e:
            raise RuntimeError(f"百炼 API 调用异常: {e}")

        if resp.status_code != 200:
            raise RuntimeError(
                f"百炼 API 调用失败: code={resp.code}, message={resp.message}"
            )

        if not resp.output or not getattr(resp.output, "results", None):
            raise RuntimeError("百炼 API 未返回结果")

        result_url = resp.output.results[0].url
        try:
            image_response = requests.get(result_url, timeout=60)
            image_response.raise_for_status()
            return image_response.content
        except Exception as e:
            raise RuntimeError(f"下载生成结果失败: {e}")


def get_ai_service() -> BaseAIService:
    provider = settings.ai_provider
    if provider == "stable_diffusion":
        return StableDiffusionAIService()
    elif provider == "bailian":
        return BailianAIService()
    return MockAIService()
