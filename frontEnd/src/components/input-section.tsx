import { ChevronRight, Check, X } from 'lucide-react'

import { ImagePreview } from '@/components/image-preview'
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
  onRemove?: () => void
}

function StepCard({
  step,
  title,
  subtitle,
  badge,
  hasContent,
  imageUrl,
  onClick,
  onRemove
}: StepCardProps) {
  return (
    <div
      className={cn(
        "w-full p-3.5 rounded-2xl flex items-center gap-3",
        "bg-card border border-border/60 shadow-soft",
        "transition-all duration-200",
        hasContent && "border-primary/30 bg-primary/5 shadow-soft-lg"
      )}
    >
      {/* 步骤编号 / 预览图 */}
      {imageUrl ? (
        <div className="relative h-10 w-10 flex-shrink-0">
          <ImagePreview
            src={imageUrl}
            alt={title}
            stopPropagation
            triggerClassName="h-10 w-10 rounded-xl bg-secondary"
          >
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          </ImagePreview>
          {onRemove && (
            <button
              type="button"
              aria-label={`删除${title}`}
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
              className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white shadow-soft backdrop-blur-sm transition-colors hover:bg-black/75"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "w-10 h-10 overflow-hidden flex items-center justify-center flex-shrink-0 rounded-full cursor-pointer",
            hasContent ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          {hasContent ? (
            <Check className="w-5 h-5" />
          ) : (
            <span className="text-sm font-semibold">{step}</span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
      >
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
      </button>
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
  onRemoveAccessory?: () => void
  onRemoveModel?: () => void
}

export function InputSection({
  onStepSelect,
  uploadedItems = { accessory: false, model: false },
  accessoryImage,
  modelImage,
  accessoryType = 'bracelet',
  onRemoveAccessory,
  onRemoveModel
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
          onRemove={onRemoveAccessory}
        />
        <StepCard
          step={2}
          title="选模特"
          subtitle="选择任意模特或上传"
          hasContent={uploadedItems.model}
          imageUrl={modelImage}
          onClick={() => onStepSelect?.(2)}
          onRemove={onRemoveModel}
        />
      </div>
    </div>
  )
}
