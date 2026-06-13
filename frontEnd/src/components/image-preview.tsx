import type { ReactNode } from 'react'
import { Maximize2, X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ImagePreviewProps {
  src: string
  alt: string
  children: ReactNode
  triggerClassName?: string
  onOpenPreview?: () => void
  stopPropagation?: boolean
}

export function ImagePreview({
  src,
  alt,
  children,
  triggerClassName,
  onOpenPreview,
  stopPropagation,
}: ImagePreviewProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          data-image-preview-trigger="true"
          aria-label={`放大预览${alt}`}
          onPointerDown={(event) => {
            if (stopPropagation) {
              event.stopPropagation()
            }
          }}
          onPointerUp={(event) => {
            if (stopPropagation) {
              event.stopPropagation()
            }
          }}
          onTouchStart={(event) => {
            if (stopPropagation) {
              event.stopPropagation()
            }
          }}
          onClick={(event) => {
            if (stopPropagation) {
              event.stopPropagation()
            }
            onOpenPreview?.()
          }}
          onKeyDown={(event) => {
            if (stopPropagation) {
              event.stopPropagation()
            }
          }}
          className={cn('group relative cursor-zoom-in overflow-hidden touch-manipulation', triggerClassName)}
        >
          {children}
          <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 shadow-soft backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-6xl border-0 bg-transparent p-0 shadow-none sm:max-w-6xl"
      >
        <DialogTitle className="sr-only">{alt}预览</DialogTitle>
        <div className="relative flex max-h-[calc(100vh-2rem)] flex-col items-center justify-center gap-3">
          <DialogClose className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-soft backdrop-blur-sm transition-colors hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/70">
            <X className="h-5 w-5" />
            <span className="sr-only">关闭预览</span>
          </DialogClose>
          <img
            src={src}
            alt={alt}
            className="max-h-[calc(100vh-4.5rem)] max-w-full rounded-2xl object-contain shadow-2xl"
          />
          <p className="rounded-full bg-black/45 px-3 py-1 text-xs text-white/85 backdrop-blur-sm">
            点击空白处或按 Esc 关闭
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
