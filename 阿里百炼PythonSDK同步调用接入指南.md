# 阿里百炼 Python SDK 同步调用接入指南

本文档整理项目中接入阿里百炼 DashScope Python SDK 的同步调用方式，便于后续 AI 生图能力接入与维护。

> 当前项目推荐服务：阿里百炼 `wan2.7-image-pro` 图像编辑/生成。
> 同步调用入口：`dashscope.aigc.image_generation.ImageGeneration.call(...)`。
> 当前后端封装参考：`backEnd/app/services/ai/bailian.py` 中的 `BailianAIService`。`backEnd/app/services/ai_service.py` 仅保留为兼容导出层。

---

## 1. 接入目标

后端通过 Python SDK 调用阿里百炼图片生成能力：

1. 读取模特图、配饰图等输入图片；
2. 将本地/远程图片转成文档支持的 Base64 data URL；
3. 使用 `ImageGeneration.call(...)` 发起同步调用；
4. 从 `rsp.output.choices[*].message.content[*].image` 取出生成图片 URL；
5. 下载生成图片二进制内容；
6. 保存到本地或返回给业务流程。

---

## 2. 依赖安装

文档要求 DashScope Python SDK 版本不低于 `1.25.15`：

```bash
pip install -U "dashscope>=1.25.15"
```

项目 `backEnd/requirements.txt` 中应包含：

```txt
dashscope>=1.25.15
requests>=2.31.0
pillow>=10.2.0
```

---

## 3. 环境变量配置

建议通过 `.env` 或部署平台环境变量配置：

```env
AI_PROVIDER=bailian
BAILIAN_API_KEY=sk-你的阿里百炼APIKey
BAILIAN_MODEL=wan2.7-image-pro

# 北京地域
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 新加坡地域使用：
# BAILIAN_BASE_URL=https://dashscope-intl.aliyuncs.com/api/v1
```

对应项目配置字段：

```python
ai_provider: Literal["mock", "stable_diffusion", "bailian"] = "mock"
bailian_api_key: str = ""
bailian_model: str = "wan2.7-image-pro"
bailian_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
```

注意：

- `BAILIAN_API_KEY` 不要提交到 Git。
- 北京和新加坡地域的 API Key 与请求地址独立，不能混用。
- 当前后端会把输入图片转成 Base64 data URL 调用 SDK，因此不再依赖 `PUBLIC_BASE_URL`。

---

## 4. 最小同步调用示例

```python
import base64
import mimetypes
import os
import urllib.request

import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message

# 北京地域；新加坡使用 https://dashscope-intl.aliyuncs.com/api/v1
dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"
api_key = os.getenv("DASHSCOPE_API_KEY")


def encode_file(file_path: str) -> str:
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("不支持或无法识别的图像格式")

    with open(file_path, "rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


image_1 = encode_file("./model.jpg")
image_2 = encode_file("./accessory.jpg")

message = Message(
    role="user",
    content=[
        {"text": "把图2的配饰自然佩戴到图1模特身上，保持场景和光线融合自然"},
        {"image": image_1},
        {"image": image_2},
    ],
)

rsp = ImageGeneration.call(
    model="wan2.7-image-pro",
    api_key=api_key,
    messages=[message],
    watermark=False,
    n=1,
    size="2K",
)

if rsp.status_code != 200:
    raise RuntimeError(f"百炼调用失败: code={rsp.code}, message={rsp.message}")

for i, choice in enumerate(rsp.output.choices):
    for j, content in enumerate(choice["message"]["content"]):
        if content.get("type") == "image":
            image_url = content["image"]
            file_name = f"output_{i}_{j}.png"
            urllib.request.urlretrieve(image_url, file_name)
```

同步调用的关键点：

- 使用 `ImageGeneration.call(...)`，SDK 内部封装同步等待流程；
- 图片放在 `Message.content` 的 `{"image": ...}` 中；
- 输入图片支持公网 URL、本地 `file://`、Base64 data URL；
- 当前项目为了兼容上传文件和远程 URL，统一转为 Base64 data URL；
- SDK 返回成功后，结果通常是图片 URL，业务侧仍需下载并保存；
- 结果 URL 有效期通常为 24 小时，请及时下载。

---

## 5. 项目封装说明

当前后端封装在 `backEnd/app/services/ai/bailian.py`：

- `_download_image(...)`：读取远程 URL、本地相对路径或 `file://` 图片；
- `_image_data_to_data_url(...)`：按原图格式转成 `data:{MIME_type};base64,...`，并应用 EXIF 方向；
- `_build_messages(...)`：构建 `Message(role="user", content=[...])`；
- `generate_image(...)`：调用 `ImageGeneration.call(...)` 并下载结果图。

业务调用仍然保持统一接口：

```python
def generate_image(
    self,
    base_image_url: str,
    accessory_image_url: Optional[str],
    prompt: str,
    negative_prompt: str = "",
    strength: float = 0.75,
    guidance_scale: float = 7.5,
) -> bytes:
    ...
```

其中 `strength` 和 `guidance_scale` 为跨 provider 的统一参数；当前 `wan2.7-image-pro` 文档接口没有对应参数，因此百炼 provider 暂不使用。

---

## 6. 参数说明

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `model` | `wan2.7-image-pro` | 百炼图片生成/编辑模型名，建议放入配置项 `BAILIAN_MODEL` |
| `messages` | `[Message(...)]` | 单轮用户消息，包含文本和 0-9 张输入图 |
| `content[].text` | `把图2的配饰自然佩戴到图1模特身上` | 正向提示词，长度不超过 5000 字符 |
| `content[].image` | 公网 URL / `file://` / Base64 data URL | 输入图像；当前项目统一传 Base64 data URL |
| `size` | `2K` | 有图片输入的图像编辑/组图场景最高支持 2K |
| `n` | `1` | 生成图片数量；关闭组图模式时取值 1-4 |
| `watermark` | `False` | 是否添加“AI生成”水印 |

---

## 7. 和当前项目业务的对应关系

| 业务字段 | 百炼调用中的作用 |
| --- | --- |
| `model.url` | 第一张输入图，作为模特/主体参考图 |
| `accessory.url` | 第二张输入图，作为配饰参考图 |
| `scene.template` | 拼接到 `text` prompt 中，描述背景/场景 |
| `scene.lighting` | 拼接到 `text` prompt 中，描述光线 |
| `options.prompt` | 追加到自动生成的 prompt 后，作为用户补充要求 |

推荐提示词构造仍由 `BaseAIService.build_prompt(...)` 统一完成。

---

## 8. 错误处理建议

建议区分以下错误，便于前端展示和后端排查：

1. **缺少配置**：未配置 `BAILIAN_API_KEY`；
2. **依赖版本过低或缺失**：未安装 `dashscope>=1.25.15`；
3. **输入图片不可读**：本地文件不存在、远程 URL 下载失败；
4. **图片格式不支持**：输入图不是 JPEG/JPG/PNG/BMP/WEBP，或尺寸/大小超出模型限制；
5. **百炼调用失败**：`rsp.status_code != 200`，记录 `rsp.code`、`rsp.message`；
6. **百炼无结果**：`rsp.output.choices` 为空，或内容里没有 `image`；
7. **结果下载失败**：生成 URL 无法下载或超时。

推荐错误信息：

```python
if rsp.status_code != 200:
    raise RuntimeError(
        f"百炼 API 调用失败: code={rsp.code}, message={rsp.message}"
    )
```

---

## 9. 落地接入步骤

1. 安装依赖：`pip install -U "dashscope>=1.25.15"`；
2. 配置环境变量：`AI_PROVIDER=bailian`、`BAILIAN_API_KEY=...`、`BAILIAN_MODEL=wan2.7-image-pro`；
3. 按地域配置 `BAILIAN_BASE_URL`；
4. 在 AI 服务层使用 `ImageGeneration.call(...)` 同步调用；
5. 从 `rsp.output.choices[*].message.content[*].image` 下载结果图片；
6. 将图片 bytes 保存到 `results` 目录，并把结果 URL 回写到任务状态。

---

## 10. 注意事项

- 同步调用会阻塞当前执行线程，建议放在后台任务队列或 worker 中执行，不要直接阻塞 FastAPI 请求线程太久。
- 生成结果 URL 通常有 24 小时有效期，业务需要及时下载并保存到自己的存储。
- 当前项目会尽量保留 JPEG/PNG/BMP/WEBP 原图格式并转成 Base64 data URL；MPO 会取首帧转 JPEG，并会应用 EXIF 方向避免手机照片旋转/颠倒。
- API Key、地域 base URL、模型名等都应配置化，避免硬编码。
- 生产环境建议记录调用耗时、失败 code/message、request_id、任务 ID，便于追踪问题。
