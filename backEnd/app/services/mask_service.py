from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from io import BytesIO


class MaskService:
    @staticmethod
    def generate_wrist_mask(image_data: bytes, region: str = "center") -> bytes:
        with Image.open(BytesIO(image_data)) as img:
            width, height = img.size

            mask = Image.new('L', (width, height), 0)
            draw = ImageDraw.Draw(mask)

            if region == "center":
                ellipse_x1 = width * 0.2
                ellipse_y1 = height * 0.3
                ellipse_x2 = width * 0.8
                ellipse_y2 = height * 0.7
            else:
                ellipse_x1 = width * 0.1
                ellipse_y1 = height * 0.2
                ellipse_x2 = width * 0.9
                ellipse_y2 = height * 0.8

            draw.ellipse(
                [ellipse_x1, ellipse_y1, ellipse_x2, ellipse_y2],
                fill=255
            )

            mask = mask.filter(ImageFilter.GaussianBlur(radius=5))

            buf = BytesIO()
            mask.save(buf, format='PNG')
            return buf.getvalue()

    @staticmethod
    def generate_mask_from_bbox(image_data: bytes, bbox: list) -> bytes:
        with Image.open(BytesIO(image_data)) as img:
            width, height = img.size

            mask = Image.new('L', (width, height), 0)
            draw = ImageDraw.Draw(mask)

            x1 = bbox[0] * width
            y1 = bbox[1] * height
            x2 = bbox[2] * width
            y2 = bbox[3] * height

            draw.rectangle([x1, y1, x2, y2], fill=255)

            buf = BytesIO()
            mask.save(buf, format='PNG')
            return buf.getvalue()
