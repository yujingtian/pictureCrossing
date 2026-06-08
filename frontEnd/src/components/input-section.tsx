import { ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccessoryType } from '@/components/step-panels'

// 配饰类型的显示信息
const accessoryTypeLabels: Record<AccessoryType, { name: string; icon: string }> = {
  bracelet: { name: '手绳/手链', icon: '📿' },
}

interface StepCardProps {
  step: number
  title: string
  subtitle: string
  badge?: string
  hasContent?: boolean
  imageUrl?: string | null
  onClick?: () => void
}

function StepCard({
  step,
  title,
  subtitle,
  badge,
  hasContent,
  imageUrl,
  onClick
}: StepCardProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={cn(
        "w-full p-3.5 rounded-2xl cursor-pointer flex items-center gap-3",
        "bg-card border border-border/60 shadow-soft",
        "transition-all duration-200 active:scale-[0.99]",
        hasContent && "border-primary/30 bg-primary/5 shadow-soft-lg"
      )}
    >
      {/* 步骤编号 / 预览图 */}
      <div className={cn(
        "w-10 h-10 overflow-hidden flex items-center justify-center flex-shrink-0",
        imageUrl ? "rounded-xl bg-secondary" : "rounded-full",
        hasContent ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      )}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : hasContent ? (
          <Check className="w-5 h-5" />
        ) : (
          <span className="text-sm font-semibold">{step}</span>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-[13px] font-medium text-foreground leading-tight">
            {title}
          </h3>
          {badge && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed truncate">
          {subtitle}
        </p>
      </div>

      {/* 箭头 */}
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </div>
  )
}

interface InputSectionProps {
  onStepSelect?: (step: number) => void
  uploadedItems?: {
    accessory: boolean
    model: boolean
  }
  accessoryImage?: string | null
  modelImage?: string | null
  accessoryType?: AccessoryType
}

export function InputSection({
  onStepSelect,
  uploadedItems = { accessory: false, model: false },
  accessoryImage,
  modelImage,
  accessoryType = 'bracelet'
}: InputSectionProps) {
  const typeInfo = accessoryTypeLabels[accessoryType]

  return (
    <div className="py-2 flex-shrink-0">
      <div className="flex flex-col gap-2 px-4">
        <StepCard
          step={1}
          title="选手绳"
          subtitle={uploadedItems.accessory ? typeInfo.name : "选择手绳款式"}
          badge={uploadedItems.accessory ? `${typeInfo.icon} ${typeInfo.name}` : undefined}
          hasContent={uploadedItems.accessory}
          imageUrl={accessoryImage}
          onClick={() => onStepSelect?.(1)}
        />
        <StepCard
          step={2}
          title="选模特"
          subtitle="选择任意模特或上传"
          hasContent={uploadedItems.model}
          imageUrl={modelImage}
          onClick={() => onStepSelect?.(2)}
        />
      </div>
    </div>
  )
}
