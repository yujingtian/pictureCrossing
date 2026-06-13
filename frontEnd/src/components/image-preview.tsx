import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent } from 'react'
import { Maximize2, X } from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImagePreviewProps {
  src: string
  alt: string
  children: ReactNode
  triggerClassName?: string
  stopPropagation?: boolean
  confirmLabel?: string
  onConfirm?: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 5

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

function getDistance(points: Array<{ x: number; y: number }>) {
  const [first, second] = points
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function getMidpoint(points: Array<{ x: number; y: number }>) {
  const [first, second] = points
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

export function ImagePreview({
  src,
  alt,
  children,
  triggerClassName,
  stopPropagation,
  confirmLabel,
  onConfirm,
}: ImagePreviewProps) {
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const activePointers = useRef(new Map<number, { x: number; y: number }>())
  const panStart = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null)
  const pinchStart = useRef<{
    distance: number
    scale: number
    midpoint: { x: number; y: number }
    offset: { x: number; y: number }
  } | null>(null)

  const resetTransform = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    activePointers.current.clear()
    panStart.current = null
    pinchStart.current = null
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetTransform()
    }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const points = Array.from(activePointers.current.values())
    if (points.length === 1) {
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        offset,
      }
      pinchStart.current = null
    } else if (points.length === 2) {
      pinchStart.current = {
        distance: getDistance(points),
        scale,
        midpoint: getMidpoint(points),
        offset,
      }
      panStart.current = null
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(event.pointerId)) return

    event.preventDefault()
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = Array.from(activePointers.current.values())

    if (points.length === 2 && pinchStart.current) {
      const nextMidpoint = getMidpoint(points)
      const nextScale = clampScale(
        pinchStart.current.scale * (getDistance(points) / pinchStart.current.distance)
      )
      setScale(nextScale)
      setOffset({
        x: pinchStart.current.offset.x + nextMidpoint.x - pinchStart.current.midpoint.x,
        y: pinchStart.current.offset.y + nextMidpoint.y - pinchStart.current.midpoint.y,
      })
      return
    }

    if (points.length === 1 && panStart.current && scale > 1) {
      setOffset({
        x: panStart.current.offset.x + event.clientX - panStart.current.x,
        y: panStart.current.offset.y + event.clientY - panStart.current.y,
      })
    }
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const points = Array.from(activePointers.current.values())
    pinchStart.current = null

    if (points.length === 1) {
      panStart.current = {
        x: points[0].x,
        y: points[0].y,
        offset,
      }
    } else {
      panStart.current = null
    }

    if (scale <= 1.01) {
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const nextScale = clampScale(scale + (event.deltaY > 0 ? -0.2 : 0.2))
    setScale(nextScale)
    if (nextScale === 1) {
      setOffset({ x: 0, y: 0 })
    }
  }

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1)
      setOffset({ x: 0, y: 0 })
      return
    }
    setScale(2)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <div
            className="relative flex h-[calc(100vh-8rem)] w-[calc(100vw-2rem)] max-w-6xl touch-none select-none items-center justify-center overflow-hidden rounded-2xl"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="max-h-full max-w-full object-contain shadow-2xl will-change-transform"
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              }}
            />
            {scale > 1 && (
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white/85 backdrop-blur-sm">
                {Math.round(scale * 100)}%
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            {onConfirm && (
              <DialogClose asChild>
                <Button
                  type="button"
                  onClick={onConfirm}
                  className="h-10 rounded-full gradient-gold px-6 text-primary-foreground shadow-soft"
                >
                  {confirmLabel ?? '确认选择'}
                </Button>
              </DialogClose>
            )}
            <p className="rounded-full bg-black/45 px-3 py-1 text-xs text-white/85 backdrop-blur-sm">
              双指缩放，拖动查看，点击空白处或按 Esc 关闭
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
