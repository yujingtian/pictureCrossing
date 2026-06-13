# pictureCrossing

AI 试戴间项目，用于将上传/选择的手绳、项链、耳饰、戒指等配饰生成到模特或手部图片上。

## 工程结构

```text
pictureCrossing/
├── frontEnd/   # Vite + React 前端
├── backEnd/    # FastAPI + SQLite 后端
├── 阿里百炼Wan2.7-Image-Pro同步调用接入指南.md     # Wan2.7 接入指南
└── 阿里百炼Qwen-Image-2.0-Pro同步调用接入指南.md   # Qwen-Image-2.0-Pro 接入指南
```

## 当前能力

- 前端主流程支持选择/上传配饰和模特/手部图片，并提交生成任务；场景能力当前保留为后端接口和未接入主流程的前端扩展点。
- 后端提供预设数据、图片上传、生成任务创建和任务状态查询接口。
- AI 生成支持多 provider：
  - `mock`：本地开发占位图；
  - `stable_diffusion`：本地 Stable Diffusion WebUI；
  - `bailian`：阿里百炼 `qwen-image-2.0-pro`，通过 Python SDK 同步调用。

## 快速启动

### 1. 后端

```bash
cd backEnd
pip install -r requirements.txt
cp .env.example .env
python main.py
```

后端默认监听：

```text
http://localhost:8000
```

API 文档：

```text
http://localhost:8000/docs
```

### 2. 前端

```bash
cd frontEnd
npm install
npm run dev
```

前端默认监听：

```text
http://localhost:5173
```

前端 API 调用使用同源 `/api/...`，本地联调时需要通过 Vite 代理或让前后端处于同一访问域名。

## 阿里百炼配置

后端 `.env` 示例：

```env
AI_PROVIDER=bailian
BAILIAN_API_KEY=sk-你的阿里百炼APIKey
BAILIAN_MODEL=qwen-image-2.0-pro
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

新加坡地域使用：

```env
BAILIAN_BASE_URL=https://dashscope-intl.aliyuncs.com/api/v1
```

注意：北京和新加坡地域的 API Key 与请求地址独立，不能混用。

接入细节：

- Wan2.7：见 [阿里百炼Wan2.7-Image-Pro同步调用接入指南.md](阿里百炼Wan2.7-Image-Pro同步调用接入指南.md)。
- Qwen-Image-2.0-Pro：见 [阿里百炼Qwen-Image-2.0-Pro同步调用接入指南.md](阿里百炼Qwen-Image-2.0-Pro同步调用接入指南.md)。

## 关键接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/presets/accessories` | 获取预设配饰 |
| `GET` | `/api/presets/models` | 获取预设模特/手部图 |
| `GET` | `/api/presets/scenes` | 获取预设场景 |
| `POST` | `/api/upload?type=accessory|model|mask` | 上传图片 |
| `POST` | `/api/generate` | 创建生成任务 |
| `GET` | `/api/generate/{task_id}` | 查询生成任务状态 |

## 生成链路

```text
前端选择/上传图片
  -> POST /api/generate
  -> 后端内存任务队列
  -> AI provider 生成图片 bytes
  -> 保存到 /results/result_<task_id>.jpg
  -> 前端轮询任务状态并显示结果图
```

百炼 provider 当前会把输入图片转成 Base64 data URL，调用 `ImageGeneration.call(...)`，并从返回的临时结果 URL 下载图片保存到本地。
