# backEnd

FastAPI 后端服务，负责预设数据、图片上传、生成任务队列、AI provider 调用和结果图片存储。

## 技术栈

- FastAPI
- SQLite + SQLAlchemy
- Pydantic v2 / pydantic-settings
- Pillow
- DashScope Python SDK（阿里百炼）
- slowapi / limits 速率限制

## 启动

```bash
cd backEnd
pip install -r requirements.txt
cp .env.example .env
python main.py
```

服务默认监听：

```text
http://localhost:8000
```

API 文档：

```text
http://localhost:8000/docs
```

## 环境变量

核心配置见 [.env.example](.env.example)。常用项：

```env
DATABASE_URL=sqlite:///./data/db.sqlite
UPLOAD_DIR=./uploads
RESULT_DIR=./results

AI_PROVIDER=mock
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=5
RATE_LIMIT_PER_DAY=50
```

### AI_PROVIDER

| 值 | 说明 |
| --- | --- |
| `mock` | 返回占位图，适合本地开发 |
| `stable_diffusion` | 调用本地 Stable Diffusion WebUI `/sdapi/v1/img2img` |
| `bailian` | 调用阿里百炼 `wan2.7-image-pro` |

### 阿里百炼

```env
AI_PROVIDER=bailian
BAILIAN_API_KEY=sk-你的阿里百炼APIKey
BAILIAN_MODEL=wan2.7-image-pro
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

新加坡地域使用：

```env
BAILIAN_BASE_URL=https://dashscope-intl.aliyuncs.com/api/v1
```

注意：地域的 API Key 与请求地址不能混用。

## 目录结构

```text
backEnd/
├── main.py                         # FastAPI 入口，挂载静态目录和 API router
├── requirements.txt
├── app/
│   ├── api/
│   │   ├── presets.py              # 预设接口
│   │   ├── upload.py               # 上传接口
│   │   └── generate.py             # 生成任务接口
│   ├── core/
│   │   └── init_data.py            # 初始化预设数据
│   ├── services/
│   │   ├── ai/                     # AI provider 拆分实现
│   │   │   ├── base.py             # BaseAIService 与通用 prompt
│   │   │   ├── bailian.py          # 阿里百炼 ImageGeneration.call 接入
│   │   │   ├── stable_diffusion.py # Stable Diffusion WebUI 接入
│   │   │   ├── mock.py             # Mock provider
│   │   │   └── factory.py          # get_ai_service()
│   │   ├── ai_service.py           # 兼容导出层
│   │   ├── storage.py              # 本地上传/结果存储
│   │   ├── task_queue.py           # 内存任务队列
│   │   └── rate_limiter.py         # 速率限制
│   ├── config.py                   # 配置
│   ├── database.py                 # DB 初始化和会话
│   ├── models.py                   # SQLAlchemy 模型
│   └── schemas.py                  # Pydantic schema
├── uploads/                        # 上传图片，运行时生成
├── results/                        # 生成结果，运行时生成
└── data/                           # SQLite 数据，运行时生成
```

## API 概览

### 上传图片

```http
POST /api/upload?type=accessory|model|mask
Content-Type: multipart/form-data
```

返回：

```json
{
  "success": true,
  "data": {
    "file_id": "accessory_xxx",
    "url": "/uploads/accessory_xxx.png",
    "thumbnail_url": "/uploads/accessory_xxx_thumb.jpg"
  }
}
```

`thumbnail_url` 仅用于前端预览；生成时使用 `url` 原图。上传大小受 `MAX_UPLOAD_SIZE` 配置限制，默认 10MB。

### 创建生成任务

```http
POST /api/generate
Content-Type: application/json
```

示例：

```json
{
  "accessory_type": "bracelet",
  "accessory": {
    "source": "upload",
    "url": "/uploads/accessory_xxx.png"
  },
  "model": {
    "source": "upload",
    "url": "/uploads/model_xxx.jpg"
  },
  "scene": {
    "id": "simple"
  },
  "options": {
    "lighting": "natural",
    "prompt": "保持手部不变，只把手绳戴在手腕上",
    "strength": 0.75,
    "guidance_scale": 7.5
  }
}
```

请求中的资源来源说明：

- `source: "preset"`：推荐传 `id`，后端会按预设 ID 查询图片和名称；
- `source: "upload"`：必须传上传接口返回的原图 `url`。

返回：

```json
{
  "success": true,
  "data": {
    "task_id": "task_xxx",
    "status": "pending"
  }
}
```

### 查询任务状态

```http
GET /api/generate/{task_id}
```

返回：

```json
{
  "success": true,
  "data": {
    "task_id": "task_xxx",
    "status": "completed",
    "progress": 100,
    "result_url": "/results/result_task_xxx.jpg"
  }
}
```

## 阿里百炼生成逻辑

`app/services/ai/bailian.py` 使用新文档中的 Python SDK 同步调用方式：

```python
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message

rsp = ImageGeneration.call(
    model=settings.bailian_model,
    api_key=settings.bailian_api_key,
    messages=[message],
    watermark=False,
    n=1,
    size="2K",
)
```

输入内容顺序：

1. 图1：模特/手部图；
2. 图2：配饰图；
3. 文本 prompt：说明把图2配饰戴到图1对应位置。

实现细节：

- 后端读取上传原图，不使用 `_thumb` 缩略图；
- 支持 JPEG/JPG/PNG/BMP/WEBP；
- MPO 图片会取首帧并转成 JPEG；
- 会应用 EXIF 方向，避免手机照片上下颠倒；
- 结果 URL 有效期有限，后端会立即下载并保存到 `results/`。

## 任务队列说明

当前任务队列是进程内内存队列：

- 服务重启后，内存中的 pending 状态不会恢复；
- 查询任务状态时会优先读取内存状态，内存中不存在时会回退查询 DB 中已有任务；
- 启动时会把 DB 中 `PROCESSING` 状态的任务重置为 `FAILED`；
- 适合当前单机开发/原型阶段。

如果后续需要生产化，建议引入 Redis/RQ/Celery 等外部队列，并持久化任务选项。
