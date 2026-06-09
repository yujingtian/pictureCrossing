# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在本仓库中工作的指导。

## 项目概述

这是一个"AI 试戴间"应用 - 用于手绳、项链、耳饰、戒指等配饰的虚拟试戴。用户可以选择配饰、模特和场景来生成虚拟试戴效果图。

## 技术栈

- **框架**: Vite + React 19 (SPA)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4 + `tw-animate-css` 动画
- **UI 组件**: shadcn/ui (New York 风格) + Radix UI 基础组件
- **包管理器**: npm / pnpm
- **图标**: lucide-react
- **主题**: next-themes (明暗模式)

## 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览生产构建
npm run preview

# 类型检查
tsc
```

## 项目结构

```
frontEnd/
├── src/
│   ├── main.tsx            # Vite 入口文件
│   ├── App.tsx             # 主应用组件
│   ├── index.css           # 全局样式和 Tailwind 配置
│   ├── components/
│   │   ├── ui/             # shadcn/ui 组件 (抽屉、按钮、卡片等)
│   │   ├── step-panels/    # 选择抽屉面板
│   │   │   ├── accessory-panel.tsx  # 配饰类型和预设选择
│   │   │   ├── model-panel.tsx      # 模特选择
│   │   │   ├── scene-panel.tsx      # 场景选择
│   │   │   ├── bracelet-panel.tsx   # 手绳选择面板
│   │   │   ├── wrist-panel.tsx      # 手腕选择面板
│   │   │   └── index.ts
│   │   ├── top-header.tsx           # 顶部固定导航
│   │   ├── main-canvas.tsx          # 图片预览区域
│   │   ├── input-section.tsx        # 三步卡片
│   │   ├── bottom-action-bar.tsx    # 生成按钮
│   │   └── theme-provider.tsx       # 主题提供者
│   ├── lib/
│   │   └── utils.ts                 # cn() 工具函数用于合并类名
│   └── hooks/
│       ├── use-mobile.ts            # 检测移动端
│       └── use-toast.ts             # 提示消息
├── public/                 # 静态资源 (图标、占位图)
├── index.html             # HTML 入口
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
├── tsconfig.node.json     # TypeScript Node 配置
├── postcss.config.mjs     # PostCSS 配置 (Tailwind CSS)
├── components.json        # shadcn/ui 配置
├── .gitignore
└── package.json
```

## 架构与关键模式

### 状态管理

状态在 `src/App.tsx` 中使用 React hooks 本地管理：
- `accessoryPanelOpen`, `modelPanelOpen`, `scenePanelOpen` - 抽屉可见性
- `selectedAccessoryType` - 配饰类型 (`bracelet` | `necklace` | `earring` | `ring`)
- `selectedAccessory`, `selectedModel`, `selectedScene` - 用户选择
- `isLoading`, `generatedImage` - 生成状态

### 组件层次

```
App (App.tsx)
├── TopHeader
├── MainCanvas (显示生成的图片或占位符)
├── InputSection (三步卡片)
├── BottomActionBar (生成按钮)
├── AccessoryPanel (抽屉)
├── ModelPanel (抽屉)
└── ScenePanel (抽屉)
```

### 样式系统

应用使用自定义设计系统：
- **主色调**: 香槟金/玫瑰金 (`oklch(0.75 0.08 55)`)
- **背景**: 珍珠白 (`oklch(0.98 0.002 90)`)
- **自定义类**: `.glass`, `.gradient-gold`, `.shadow-soft`, `.shadow-soft-lg`, `.safe-bottom`, `.scrollbar-hide`
- **移动端优先**: 为移动屏幕设计 (最大宽度: lg)

### 配饰类型

```typescript
type AccessoryType = 'bracelet' | 'necklace' | 'earring' | 'ring'
```

每种类型有不同的预设图片和对应的模特身体部位。

## 重要说明

- **TypeScript**: 已启用严格模式
- **路径别名**: `@/*` 指向 `src/`
- **移动端优化**: 视口禁用用户缩放，包含安全区域内边距
- **语言**: zh-CN (中文)

## 当前状态

应用已接入后端 API：预设数据、图片上传、生成任务创建和任务状态轮询均通过 `/api/...` 调用后端。

生成链路由后端 `AI_PROVIDER` 决定：
- `mock`：返回占位图，适合本地开发；
- `stable_diffusion`：调用本地 Stable Diffusion WebUI；
- `bailian`：调用阿里百炼 `wan2.7-image-pro`。

上传接口返回 `url` 和 `thumbnail_url`：前端预览可使用 `thumbnail_url`，提交生成任务必须使用 `url` 原图。
