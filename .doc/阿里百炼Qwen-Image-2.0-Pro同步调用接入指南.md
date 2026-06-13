# 阿里百炼 Qwen-Image-2.0-Pro 图像编辑同步调用接入指南

本文档整理阿里百炼 `qwen-image-2.0-pro` 的 Python SDK 同步图像编辑调用方式，参考根目录资料 `阿里百炼wan2.7-image-pro接入.md`。该根目录资料当前记录的是千问图像编辑接口，支持 1-3 张输入图片，适用于本项目“模特/手部图 + 手绳图 -> 真实试戴效果图”的业务。

> 注意：`qwen-image-2.0-pro` 的同步调用入口是 `dashscope.MultiModalConversation.call(...)`。  
> 与旧 Wan2.7 的 `ImageGeneration.call(...)` 不同，Qwen 图像编辑同样支持图片输入，但图片需要作为 `messages[0].content` 中的 `{"image": ...}` 条目传入。

---

## 1. 模型与接口概览

| 项 | 说明 |
| --- | --- |
| 模型名 | `qwen-image-2.0-pro` |
| 能力 | 千问图像生成与编辑模型 Pro 系列，支持单图编辑、多图融合、文字渲染、真实质感和语义遵循 |
| 同步接口 | `POST /api/v1/services/aigc/multimodal-generation/generation` |
| Python SDK 入口 | `dashscope.MultiModalConversation.call(...)` |
| 输入图片 | `messages[0].content` 中放入 1-3 个 `{"image": ...}` 条目 |
| 编辑指令 | `messages[0].content` 中放入 1 个 `{"text": ...}` 条目 |
| 返回结果 | `response.output.choices[*].message.content[*].image` 中的临时图片 URL |
| 输出格式 | PNG |
| 链接有效期 | 通常 24 小时，业务侧应及时下载保存 |

北京地域：

```text
https://dashscope.aliyuncs.com/api/v1
```

新加坡地域：

```text
https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1
```

北京和新加坡地域的 API Key 与请求地址独立，不能混用。新加坡地域调用时需要将 `{WorkspaceId}` 替换为真实 Workspace ID。

---

## 2. 依赖安装

```bash
pip install -U dashscope requests pillow
```

项目 `backEnd/requirements.txt` 中建议保留：

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
BAILIAN_MODEL=qwen-image-2.0-pro

# 北京地域
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 新加坡地域示例，需替换 WorkspaceId
# BAILIAN_BASE_URL=https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1
```

对应项目配置字段：

```python
ai_provider: Literal["mock", "stable_diffusion", "bailian"] = "mock"
bailian_api_key: str = ""
bailian_model: str = "qwen-image-2.0-pro"
bailian_base_url: str = "https://dashscope.aliyuncs.com/api/v1"
```

注意：

- `BAILIAN_API_KEY` 不要提交到 Git。
- `BAILIAN_BASE_URL` 应按 API Key 所属地域配置。
- Qwen 图像编辑支持通过公网 URL、OSS 临时 URL 或 Base64 data URL 传入图片。
- 本项目上传图片通常是后端本地路径，推荐在调用百炼前转为 `data:{mime};base64,{base64_data}`。

---

## 4. Python SDK 多图编辑最小示例

### 4.1 通过公网 URL 传入图片

```python
import json
import os
import urllib.request

import dashscope
from dashscope import MultiModalConversation

# 北京地域；新加坡地域使用 https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1
dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"

api_key = os.getenv("DASHSCOPE_API_KEY") or os.getenv("BAILIAN_API_KEY")

messages = [
    {
        "role": "user",
        "content": [
            {"image": "https://example.com/model_or_hand.png"},
            {"image": "https://example.com/bracelet.png"},
            {
                "text": "使用图一作为模特/手部底图，请勿改变图一的手型、姿势、皮肤纹理、背景和光线。将图二中的手绳原样佩戴到图一手腕位置，保持图二手绳的编织结构、珠子/吊坠、颜色、材质和细节。只做必要的缩放、透视弯曲、遮挡、阴影和高光融合，不要重新设计手绳。"
            },
        ],
    }
]

response = MultiModalConversation.call(
    api_key=api_key,
    model="qwen-image-2.0-pro",
    messages=messages,
    stream=False,
    n=1,
    watermark=False,
    negative_prompt="低分辨率，低画质，手指畸形，手部变形，饰品漂浮，像贴纸，改变手绳款式，额外饰品，AI感明显",
    prompt_extend=True,
    size="2048*2048",
)

if response.status_code != 200:
    raise RuntimeError(
        f"百炼 Qwen-Image 调用失败: status_code={response.status_code}, "
        f"code={response.code}, message={response.message}, request_id={response.request_id}"
    )

print(json.dumps(response, ensure_ascii=False, indent=2))

for choice_index, choice in enumerate(response.output.choices):
    message = choice.get("message") if isinstance(choice, dict) else choice.message
    content_list = message.get("content") if isinstance(message, dict) else message.content
    for content_index, content in enumerate(content_list):
        image_url = content.get("image") if isinstance(content, dict) else getattr(content, "image", None)
        if image_url:
            file_name = f"qwen_image_edit_{choice_index}_{content_index}.png"
            urllib.request.urlretrieve(image_url, file_name)
            print(f"saved: {file_name}")
```

### 4.2 通过 Base64 data URL 传入图片

本项目后端已有 `_download_image(...)` 和 `_image_data_to_data_url(...)` 之类的工具函数，可复用它们将上传图转为 data URL。

```python
import base64
import mimetypes


def encode_file(file_path: str) -> str:
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("不支持或无法识别的图像格式")

    with open(file_path, "rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


model_image = encode_file("/path/to/model_or_hand.png")
bracelet_image = encode_file("/path/to/bracelet.png")

messages = [
    {
        "role": "user",
        "content": [
            {"image": model_image},
            {"image": bracelet_image},
            {"text": "使用图一作为底图，将图二手绳真实佩戴到图一手腕上。"},
        ],
    }
]
```

---

## 5. 请求参数说明

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `model` | `qwen-image-2.0-pro` | 模型名，建议通过 `BAILIAN_MODEL` 配置 |
| `messages` | `[{"role":"user","content":[{"image":"..."},{"image":"..."},{"text":"..."}]}]` | 当前同步接口仅支持单轮 user 消息 |
| `content[].image` | `https://...` / `data:image/png;base64,...` | 输入图片，支持 1-3 张 |
| `content[].text` | `使用图一作为底图...` | 编辑指令；只能传 1 个 text |
| `stream` | `False` | 同步非流式调用 |
| `watermark` | `False` | 是否添加 Qwen-Image 水印 |
| `prompt_extend` | `True` | 是否开启提示词智能改写；若要更严格还原手绳，可尝试设为 `False` |
| `negative_prompt` | `低分辨率...` | 反向提示词，长度不超过约 500 字符 |
| `size` | `2048*2048` | 输出分辨率，格式为 `宽*高`；除 `qwen-image-edit` 外支持设置 |
| `n` | `1` | 输出图片数量；Qwen-Image 2.0 系列可选 1-6 张 |
| `seed` | `12345` | 可选随机种子，结果仍不保证完全一致 |

图片输入要求：

- 支持 1-3 张输入图片。
- 多图输入时，图片顺序很重要；prompt 中应明确“图一”“图二”的含义。
- 多图输入时，输出图像比例默认会参考最后一张输入图；若本项目希望输出比例更接近模特/手部图，建议显式设置 `size`，或根据业务调整图片顺序并实测效果。
- 支持格式：JPG、JPEG、PNG、BMP、TIFF、WEBP、GIF；GIF 仅处理第一帧。
- 推荐图片宽高均在 384-3072 像素之间。
- 单张图片大小不超过 10MB。
- 支持公网 URL、OSS 临时 URL、Base64 data URL。

推荐分辨率：

| 比例 | `size` |
| --- | --- |
| 1:1 | `1024*1024`、`1536*1536`、`2048*2048` |
| 2:3 | `768*1152`、`1024*1536` |
| 3:2 | `1152*768`、`1536*1024` |
| 3:4 | `960*1280`、`1080*1440` |
| 4:3 | `1280*960`、`1440*1080` |
| 9:16 | `720*1280`、`1080*1920` |
| 16:9 | `1280*720`、`1920*1080` |

Qwen-Image 2.0 系列输出图像总像素需在 `512*512` 到 `2048*2048` 等价像素范围内。

---

## 6. 项目封装建议

当前项目已有统一 AI 服务接口：

```python
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
    ...
```

接入 `qwen-image-2.0-pro` 图像编辑时建议：

1. 保持 `BailianAIService.generate_image(...)` 对外签名不变，避免影响任务队列和 API 层。
2. Qwen 分支内部使用 `MultiModalConversation.call(...)`。
3. 将 `base_image_url` 解析为图一，表示模特/手部底图。
4. 将 `accessory_image_url` 解析为图二，表示需要还原的手绳/配饰参考图。
5. 使用现有 `_download_image(...)` + `_image_data_to_data_url(...)` 将本地上传文件转为 Base64 data URL。
6. 构造 `messages[0].content` 时按顺序放入：
   - `{"image": base_image}`
   - `{"image": accessory_image}`
   - `{"text": prompt}`
7. 将 `negative_prompt` 映射到 SDK 参数。
8. 将 `watermark` 固定为 `False`。
9. 将 `n` 固定为 `1`。
10. 将 `size` 配置为 `2048*2048` 或新增配置项控制。
11. 从返回结果中提取图片 URL，并下载为 bytes 返回。

示例封装核心逻辑：

```python
import dashscope
import requests
from dashscope import MultiModalConversation


dashscope.base_http_api_url = settings.bailian_base_url

base_image = self._image_data_to_data_url(self._download_image(base_image_url))
accessory_image = self._image_data_to_data_url(self._download_image(accessory_image_url))

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

response = MultiModalConversation.call(
    api_key=settings.bailian_api_key,
    model="qwen-image-2.0-pro",
    messages=messages,
    stream=False,
    n=1,
    watermark=False,
    prompt_extend=True,
    negative_prompt=negative_prompt or " ",
    size="2048*2048",
)

if response.status_code != 200:
    raise RuntimeError(
        f"百炼 API 调用失败: status_code={response.status_code}, "
        f"code={response.code}, message={response.message}, request_id={response.request_id}"
    )

result_url = extract_image_url(response)
image_response = requests.get(result_url, timeout=60)
image_response.raise_for_status()
return image_response.content
```

---

## 7. 当前试戴业务映射

项目当前前端会选择：

| 业务字段 | Qwen 图像编辑输入 |
| --- | --- |
| `model.url` | 图一：模特/手部底图，要求尽量保持不变 |
| `accessory.url` | 图二：手绳/配饰参考图，要求尽量原样还原 |
| `prompt` | 编辑指令：将图二配饰佩戴到图一对应位置 |

推荐 prompt 结构：

```text
使用图一作为模特/手部底图，请保持图一的手型、手指、皮肤纹理、姿势、构图、背景和光线尽量不变。
将图二中的手绳原样佩戴到图一手腕位置，图二手绳就是最终要佩戴的实物参考。
必须尽量保持图二手绳的原始款式、编织结构、珠子/吊坠形状、材质、颜色、纹理和细节，不要重新设计、不要美化改款、不要替换成其他手链、不要生成额外饰品。
手绳必须像真实饰品一样环绕并贴合手腕，有合理的前后遮挡、阴影和高光；只能做必要的缩放、透视弯曲、遮挡和光影融合。
不要让手绳漂浮在皮肤上方，不要像贴纸一样平铺，不要和手腕分离。
```

推荐 negative prompt：

```text
低分辨率，低画质，模糊，手指畸形，手部变形，手腕变形，饰品漂浮，像贴纸，饰品与手腕分离，改变手绳款式，重新设计手绳，额外饰品，多余手链，错误遮挡，明显AI感
```

注意：

- 若目标是“严格还原上传手绳”，Qwen 分支必须传入 `accessory_image_url`，不能只传文字 prompt。
- `prompt_extend=True` 会增强描述，但也可能改写指令；如果发现手绳还原度下降，可尝试 `prompt_extend=False`。
- 多图输入的顺序应与 prompt 中“图一”“图二”一致。
- 当前业务建议顺序为：图一模特/手部图，图二手绳图，最后 text 编辑指令。

---

## 8. 错误处理建议

建议区分以下错误，便于前端展示和后端排查：

1. **缺少配置**：未配置 `BAILIAN_API_KEY`。
2. **地域不匹配**：API Key 与 `BAILIAN_BASE_URL` 地域不一致。
3. **依赖缺失或版本过低**：未安装 DashScope SDK。
4. **输入图片缺失**：Qwen 图像编辑至少需要 1 张输入图；当前试戴业务需要模特图和配饰图两张图。
5. **输入图片格式不合法**：不是支持的图片格式，或 Base64 data URL 格式错误。
6. **输入图片尺寸/大小不合法**：图片过小、过大或超过 10MB。
7. **提示词不合法**：提示词为空、过长或包含不支持内容。
8. **参数不合法**：`size`、`n`、`seed` 等参数超出模型范围。
9. **百炼调用失败**：`response.status_code != 200`，记录 `response.code`、`response.message`、`response.request_id`。
10. **百炼无结果**：`output.choices` 为空或内容中没有 `image`。
11. **结果下载失败**：生成 URL 过期、网络不可达或下载超时。

推荐错误信息：

```python
if response.status_code != 200:
    raise RuntimeError(
        f"百炼 API 调用失败: status_code={response.status_code}, "
        f"code={response.code}, message={response.message}, request_id={response.request_id}"
    )
```

---

## 9. 落地接入步骤

1. 配置环境变量：`AI_PROVIDER=bailian`、`BAILIAN_API_KEY=...`、`BAILIAN_MODEL=qwen-image-2.0-pro`。
2. 按地域配置 `BAILIAN_BASE_URL`。
3. 在后端百炼 provider 中使用 `MultiModalConversation.call(...)`。
4. Qwen 分支构造多模态消息：`image(model)`、`image(accessory)`、`text(prompt)`。
5. 复用现有图片下载与 data URL 编码逻辑，把本地上传图转为百炼支持的 Base64 data URL。
6. 解析 `response.output.choices[*].message.content[*].image` 获取结果 URL。
7. 下载结果图片并保存到 `RESULT_DIR`，返回 `/results/...` 给前端。
8. 使用真实 provider 验证：
   - 上传手部/模特图；
   - 上传手绳图；
   - 选择 `qwen-image-2.0-pro`；
   - 检查生成结果是否尽量保留图一手部与图二手绳款式。
9. 若手绳还原度不足，依次尝试：
   - 强化 prompt 中“图二原样还原”的描述；
   - 将 `prompt_extend` 改为 `False`；
   - 调整 `size` 与输入图比例；
   - 使用更清晰、背景更干净的手绳参考图。

---

## 10. 参考资料

- 根目录资料：`阿里百炼wan2.7-image-pro接入.md`
- 后端 provider：`backEnd/app/services/ai/bailian.py`
