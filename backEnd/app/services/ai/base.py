from typing import Optional


class BaseAIService:
    """AI 服务基类"""

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
        """
        图生图：基于基础图片（模特）和配饰图片，生成佩戴配饰后的效果图

        Args:
            base_image_url: 基础图片 URL（模特图）
            accessory_image_url: 配饰图片 URL（可选）
            prompt: 正向提示词
            negative_prompt: 反向提示词
            strength: 重绘强度 0.0-1.0
            guidance_scale: 提示词引导强度
            model: 请求级模型覆盖

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
            "bracelet": "手绳",
            "necklace": "项链",
            "earring": "耳饰",
            "ring": "戒指"
        }
        placement_desc = {
            "bracelet": "佩戴到图1模特的手腕上",
            "necklace": "佩戴到图1模特的颈部",
            "earring": "佩戴到图1模特的耳朵上",
            "ring": "佩戴到图1模特的手指上"
        }
        lighting_desc = {
            "natural": "自然光，柔和明亮",
            "warm": "暖色调，温馨浪漫",
            "cool": "冷色调，时尚高级"
        }
        accessory_type_name = type_names.get(accessory_type, "配饰")
        placement_text = placement_desc.get(accessory_type, "佩戴到图1模特身上合适的位置")
        lighting_text = lighting_desc.get(lighting, lighting_desc["natural"])

        return f"""请基于两张输入图片生成真实佩戴效果图：图1是模特/手部照片，图2是需要佩戴的{accessory_type_name}。
核心任务：把图2中的{accessory_type_name}原样戴到图1模特的手腕上，图2手绳就是最终要佩戴的实物参考。
{accessory_type_name}的款式是：{accessory_name}。
场景：{scene_template}。
光线：{lighting_text}。
要求：保持图1手部整体图片不变，包括手型、手指、皮肤纹理、姿势、构图、背景和光线都不要改动；只在手腕位置新增图2的{accessory_type_name}，不要重绘手部，不要改变手腕粗细；必须尽量保持图2手绳的原始款式、编织结构、珠子/吊坠形状、材质、颜色、纹理和细节，不要重新设计、不要美化改款、不要简化、不要替换成其他手链、不要生成额外饰品；手绳必须像真实饰品一样环绕并贴合手腕，有前后遮挡关系，一部分位于手腕前侧可见，一部分沿手腕侧面弯曲并被手腕遮挡；只能做必要的透视弯曲、缩放、遮挡、阴影和高光融合；不要让手绳漂浮在皮肤上方，不要像贴纸一样平铺在图片上，不要和手腕分离。""".strip()
