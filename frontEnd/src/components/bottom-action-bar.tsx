import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomActionBarProps {
  isActive?: boolean
  isLoading?: boolean
  onGenerate?: () => void
}

export function BottomActionBar({ isActive, isLoading, onGenerate }: BottomActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-bottom">
      <div className="px-4 pt-2.5 pb-3 max-w-lg mx-auto">
        <button
          onClick={onGenerate}
          disabled={!isActive || isLoading}
          className={cn(
            "w-full h-12 rounded-2xl font-medium text-[15px]",
            "flex items-center justify-center gap-2",
            "transition-all duration-300",
            "shadow-soft-lg active:scale-[0.98]",
            isActive
              ? "gradient-gold text-primary-foreground"
              : "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
          )}
        >
          <Sparkles className={cn(
            "w-[18px] h-[18px]",
            isLoading && "animate-pulse"
          )} />
          {isLoading ? '生成中，请耐心等待' : '一键生成试戴效果'}
        </button>

        {/* 提示文字 */}
        {isLoading ? (
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            图片生成可能需要 30 秒到 1 分钟，期间请不要关闭页面
          </p>
        ) : !isActive && (
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            请先完成上方两个步骤
          </p>
        )}
      </div>
    </div>
  )
}
