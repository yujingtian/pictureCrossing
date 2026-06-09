# frontEnd

AI 试戴间前端工程。用户可以选择或上传配饰、模特/手部图、场景，并调用后端生成虚拟试戴结果。

## 技术栈

- Vite
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui + Radix UI
- lucide-react
- next-themes

## 启动

```bash
cd frontEnd
npm install
npm run dev
```

默认地址：

```text
http://localhost:5173
```

构建：

```bash
npm run build
```

预览：

```bash
npm run preview
```

## 与后端联调

前端 API 调用统一使用相对路径 `/api/...`：

- `GET /api/presets/accessories`
- `GET /api/presets/models`
- `GET /api/presets/scenes`
- `POST /api/upload`
- `POST /api/generate`
- `GET /api/generate/{task_id}`

本地开发时需要满足以下任一方式：

1. 前端和后端通过同一域名访问，并由反向代理转发 `/api`；
2. 在 Vite 中配置 `/api` proxy 到 `http://localhost:8000`；
3. 直接通过后端静态服务托管前端构建产物。

当前 `src/services/api.ts` 默认使用：

```typescript
fetch('/api/generate', ...)
```

或：

```typescript
new URL('/api/upload', window.location.origin)
```

因此如果只分别启动 `localhost:5173` 和 `localhost:8000`，但没有代理，浏览器会请求 `localhost:5173/api/...`。

## 关键文件

```text
frontEnd/src/
├── App.tsx                         # 主流程状态管理与生成任务调度
├── services/api.ts                 # 后端 API 封装
├── types/api.ts                    # 前后端 API 类型
├── components/
│   ├── main-canvas.tsx             # 主预览区域
│   ├── input-section.tsx           # 三步选择入口
│   ├── bottom-action-bar.tsx       # 生成按钮
│   └── step-panels/
│       ├── accessory-panel.tsx     # 配饰预设/上传
│       ├── model-panel.tsx         # 模特/手部图预设/上传
│       └── scene-panel.tsx         # 场景选择
└── hooks/use-toast.ts              # 错误/状态提示
```

## API 类型约定

类型定义在 `src/types/api.ts`。

### 上传返回

```typescript
interface UploadResponse {
  file_id: string
  url: string
  thumbnail_url?: string
}
```

说明：

- `url` 是原图地址，提交生成任务时使用；
- `thumbnail_url` 是后端生成的 `_thumb` 预览图，仅用于前端展示，不传给 AI 生成。

### 生成请求

```typescript
interface CreateGenerationRequest {
  accessory_type: string
  accessory: {
    source: string
    id?: string
    url?: string
  }
  model: {
    source: string
    id?: string
    url?: string
    mask_url?: string
  }
  scene?: {
    id: string
  }
  options?: {
    lighting?: string
    prompt?: string
    strength?: number
    guidance_scale?: number
  }
}
```

当前阿里百炼 provider 会使用：

- `model.url` / 预设模特图作为图1；
- `accessory.url` / 预设配饰图作为图2；
- `options.prompt` 追加到后端自动生成的 prompt 后；
- `strength`、`guidance_scale` 为跨 provider 参数，百炼当前不使用。

### 生成状态

```typescript
interface TaskStatusResponse {
  task_id: string
  status: string
  progress?: number
  result_url?: string
  error?: string
}
```

前端应轮询 `GET /api/generate/{task_id}`，直到：

- `status === 'completed'`：显示 `result_url`；
- `status === 'failed'`：展示 `error`。

## 当前生成链路

```text
用户选择/上传配饰和模特图
  -> uploadImage() 返回 url/thumbnail_url
  -> createGeneration() 提交原图 url
  -> 后端任务队列调用 AI provider
  -> getTaskStatus() 轮询结果
  -> MainCanvas 显示 /results/result_<task_id>.jpg
```

## 注意事项

- 前端不要把 `_thumb` 缩略图传给生成接口，应使用上传返回的 `url`。
- 若后端返回 429，说明触发限流，应提示用户稍后再试。
- 图片格式/尺寸错误会由后端返回失败状态，前端展示 `error` 即可。
- 阿里百炼的结果 URL 会由后端下载并保存，前端只需要展示后端返回的 `/results/...`。
