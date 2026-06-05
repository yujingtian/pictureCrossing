import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TopHeader() {
  return (
    <header className="glass fixed top-0 left-0 right-0 z-50 border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* 左侧留白保持平衡 */}
        <div className="w-9" />

        {/* 居中标题 */}
        <h1 className="text-base font-medium tracking-wide text-foreground/90">
          AI 试戴间
        </h1>

        {/* 右侧图标 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent/50"
        >
          <History className="h-[18px] w-[18px]" />
          <span className="sr-only">历史记录</span>
        </Button>
      </div>
    </header>
  )
}
