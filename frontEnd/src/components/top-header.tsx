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

        {/* 右侧留白保持平衡 */}
        <div className="w-9" />
      </div>
    </header>
  )
}
