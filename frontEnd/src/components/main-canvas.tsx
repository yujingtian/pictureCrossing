import { Sparkles, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MainCanvasProps {
  imageUrl?: string | null
  isLoading?: boolean
}

export function MainCanvas({ imageUrl, isLoading }: MainCanvasProps) {
  return (
    <div className="px-4 h-full">
      <div
        className={cn(
          "relative w-full h-full max-h-[50vh] mx-auto rounded-3xl overflow-hidden",
          "bg-gradient-to-b from-secondary/80 to-muted/60",
          "border-2 border-dashed border-border/60",
          "shadow-soft transition-all duration-300",
          imageUrl && "border-solid border-primary/30"
        )}
        style={{ aspectRatio: '4/5' }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">
              魔法生成中...
            </p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="试戴效果图"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            {/* 装饰性背景元素 */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-[15%] left-[20%] w-20 h-20 rounded-full bg-primary/5 blur-2xl" />
              <div className="absolute bottom-[25%] right-[15%] w-24 h-24 rounded-full bg-accent/10 blur-2xl" />
              <div className="absolute top-[40%] right-[25%] w-16 h-16 rounded-full bg-primary/8 blur-xl" />
            </div>

            {/* 主要提示内容 */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-card shadow-soft flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-primary/70" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-medium text-foreground/80 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  上传元素，见证魔法
                </p>
                <p className="text-xs text-muted-foreground">
                  选择配饰和模特后生成试戴效果图
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
