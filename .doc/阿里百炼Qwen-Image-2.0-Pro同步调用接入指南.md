# 阿里百炼 Qwen-Image-2.0-Pro Python SDK 同步调用接入指南

本文档整理阿里百炼 `qwen-image-2.0-pro` 的 Python SDK 同步调用方式，参考根目录资料 `阿里百炼qwen-image-2.0-pro接入.md`，用于后续将项目后端从 Wan2.7 接入方式迁移到 Qwen-Image-2.0-Pro。

> 注意：`.doc/阿里百炼Wan2.7-Image-Pro同步调用接入指南.md` 保留为 `wan2.7-image-pro` 的 `ImageGeneration.call(...)` 接入指南。  
> 本文档专门描述 `qwen-image-2.0-pro`，其同步调用入口为 `dashscope.MultiModalConversation.call(...)`，不要直接沿用 Wan2.7 的 `ImageGeneration.call(...)` 代码结构。

---

## 1. 模型与接口概览

| 项 | 说明 |
| --- | --- |
| 模型名 | `qwen-image-2.0-pro` |
| 推荐用途 | 千问图像生成与编辑模型 Pro 系列，文字渲染、真实质感、语义遵循能力更强 |
| 同步接口 | `POST /api/v1/services/aigc/multimodal-generation/generation` |
| Python SDK 入口 | `dashscope.MultiModalConversation.call(...)` |
| 返回结果 | `response.output.choices[*].message.content[*].image` 中的临时图片 URL |
| 图片格式 | PNG |
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
- 当前项目原有 Wan2.7 接入使用 `ImageGeneration.call(...)`，迁移 Qwen-Image-2.0-Pro 时需要改为 `MultiModalConversation.call(...)`。

---

## 4. 最小 Python SDK 同步调用示例

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
            {
                "text": "生成一张高端珠宝广告图：柔和自然光下，一只优雅手腕佩戴金色手链，背景简洁，真实摄影风格，细节清晰。"
            }
        ],
    }
]

response = MultiModalConversation.call(
    api_key=api_key,
    model="qwen-image-2.0-pro",
    messages=messages,
    result_format="message",
    stream=False,
    watermark=False,
    prompt_extend=True,
    negative_prompt="低分辨率，低画质，肢体畸形，手指畸形，画面过饱和，蜡像感，人脸无细节，过度光滑，画面具有AI感，构图混乱，文字模糊，扭曲。",
    size="2048*2048",
)

if response.status_code != 200:
    raise RuntimeError(
        f"百炼 Qwen-Image 调用失败: code={response.code}, message={response.message}"
    )

print(json.dumps(response, ensure_ascii=False, indent=2))

for choice_index, choice in enumerate(response.output.choices):
    message = choice.get("message") if isinstance(choice, dict) else choice.message
    content_list = message.get("content") if isinstance(message, dict) else message.content
    for content_index, content in enumerate(content_list):
        image_url = content.get("image") if isinstance(content, dict) else getattr(content, "image", None)
        if image_url:
            file_name = f"qwen_image_{choice_index}_{content_index}.png"
            urllib.request.urlretrieve(image_url, file_name)
            print(f"saved: {file_name}")
```

关键点：

- 使用 `MultiModalConversation.call(...)`，不是 `ImageGeneration.call(...)`。
- `messages` 是普通 dict 数组，消息角色为 `user`。
- `result_format="message"`，返回结果在 `output.choices[*].message.content[*].image`。
- 返回的 `image` 是临时公网 URL，业务侧应立即下载并保存到自己的 `results/` 目录。

---

## 5. 参数说明

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `model` | `qwen-image-2.0-pro` | 模型名，建议通过 `BAILIAN_MODEL` 配置 |
| `messages` | `[{"role":"user","content":[{"text":"..."}]}]` | 当前同步文生图请求只需要单轮 user 消息 |
| `content[].text` | `生成一张...` | 正向提示词；Qwen-Image-2.0 系列长度上限约 1300 Token，超出会截断 |
| `result_format` | `message` | 建议固定为 `message`，便于解析图片 URL |
| `stream` | `False` | 同步非流式调用 |
| `watermark` | `False` | 是否添加 Qwen-Image 水印 |
| `prompt_extend` | `True` | 是否开启提示词智能改写；需要更可控时可设为 `False` |
| `negative_prompt` | `低分辨率...` | 反向提示词，长度不超过约 500 字符 |
| `size` | `2048*2048` | 输出分辨率，格式为 `宽*高` |
| `n` | `1` | 输出图片数量；Qwen-Image-2.0 系列可选 1-6 张 |
| `seed` | `12345` | 可选随机种子，结果仍不保证完全一致 |

推荐分辨率：

| 比例 | `size` |
| --- | --- |
| 1:1 | `2048*2048` |
| 16:9 | `2688*1536` |
| 9:16 | `1536*2688` |
| 4:3 | `2368*1728` |
| 3:4 | `1728*2368` |

Qwen-Image-2.0 系列输出图像总像素需在 `512*512` 到 `2048*2048` 等价像素范围内；使用官方推荐分辨率即可。

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
) -> bytes:
    ...
```

迁移到 `qwen-image-2.0-pro` 时建议：

1. 保持 `BailianAIService.generate_image(...)` 对外签名不变，避免影响任务队列和 API 层。
2. 内部调用从 `ImageGeneration.call(...)` 改为 `MultiModalConversation.call(...)`。
3. 将项目已有 prompt 作为 `messages[0].content[0].text` 传入。
4. 将 `settings.bailian_model` 传给 `model`，默认值为 `qwen-image-2.0-pro`。
5. 将 `negative_prompt` 映射到 `negative_prompt` 参数。
6. 将 `watermark` 固定为 `False`。
7. 将 `size` 配置为 `2048*2048` 或新增配置项控制。
8. 从返回结果中提取图片 URL，并下载为 bytes 返回。

示例封装核心逻辑：

```python
import dashscope
import requests
from dashscope import MultiModalConversation


dashscope.base_http_api_url = settings.bailian_base_url

response = MultiModalConversation.call(
    api_key=settings.bailian_api_key,
    model=settings.bailian_model,
    messages=[
        {
            "role": "user",
            "content": [{"text": prompt}],
        }
    ],
    result_format="message",
    stream=False,
    watermark=False,
    prompt_extend=True,
    negative_prompt=negative_prompt or None,
    size="2048*2048",
)

if response.status_code != 200:
    raise RuntimeError(
        f"百炼 API 调用失败: code={response.code}, message={response.message}"
    )

result_url = extract_image_url(response)
image_response = requests.get(result_url, timeout=60)
image_response.raise_for_status()
return image_response.content
```

---

## 7. 关于当前试戴业务的注意事项

项目当前前端会选择：

| 业务字段 | 当前含义 |
| --- | --- |
| `model.url` | 模特/手部图 |
| `accessory.url` | 配饰图 |
| `prompt` | 试戴生成说明 |

`wan2.7-image-pro` 接入方式支持在 `Message.content` 中放入多张输入图；而 `qwen-image-2.0-pro` 本文档引用的同步示例以文生图为主，入口和参数结构已变为 `MultiModalConversation.call(...)`。

因此迁移时需要先确认目标能力：

- 如果只做文生图：按本文档直接接入 `qwen-image-2.0-pro`。
- 如果仍要严格使用用户上传的模特图和配饰图进行图像编辑/试戴：需要结合阿里百炼“千问-图像编辑”接口或官方支持的图像输入格式进一步确认，再决定是否把 `model.url`、`accessory.url` 转成可传入的图像内容。
- 不建议在未确认图像输入契约前，简单把 Wan2.7 的多图 `ImageGeneration.call(...)` 代码替换为 Qwen 模型名。

---

## 8. 错误处理建议

建议区分以下错误，便于前端展示和后端排查：

1. **缺少配置**：未配置 `BAILIAN_API_KEY`。
2. **地域不匹配**：API Key 与 `BAILIAN_BASE_URL` 地域不一致。
3. **依赖缺失或版本过低**：未安装 DashScope SDK。
4. **提示词不合法**：提示词为空、过长或包含不支持内容。
5. **参数不合法**：`size`、`n`、`seed` 等参数超出模型范围。
6. **百炼调用失败**：`response.status_code != 200`，记录 `response.code`、`response.message`、`response.request_id`。
7. **百炼无结果**：`output.choices` 为空或内容中没有 `image`。
8. **结果下载失败**：生成 URL 过期、网络不可达或下载超时。

推荐错误信息：

```python
if response.status_code != 200:
    raise RuntimeError(
        f"百炼 API 调用失败: code={response.code}, message={response.message}, request_id={response.request_id}"
    )
```

---

## 9. 落地接入步骤

1. 保留 Wan2.7 指南，新增本文档作为 Qwen-Image-2.0-Pro 接入依据。
2. 确认当前业务是否需要图像输入编辑能力；如需要，先补充官方图像编辑接口契约。
3. 配置环境变量：`AI_PROVIDER=bailian`、`BAILIAN_API_KEY=...`、`BAILIAN_MODEL=qwen-image-2.0-pro`。
4. 按地域配置 `BAILIAN_BASE_URL`。
5. 将后端百炼 provider 的 SDK 调用入口改为 `MultiModalConversation.call(...)`。
6. 解析 `response.output.choices[*].message.content[*].image` 获取结果 URL。
7. 下载结果图片并保存到 `RESULT_DIR`，返回 `/results/...` 给前端。
8. 使用 mock provider 和真实 provider 分别验证前端任务创建、轮询和结果展示流程。

---

## 10. 参考资料

- 根目录资料：`阿里百炼qwen-image-2.0-pro接入.md`
- Wan2.7 接入指南：`.doc/阿里百炼Wan2.7-Image-Pro同步调用接入指南.md`
- 后端 provider：`backEnd/app/services/ai/bailian.py`
