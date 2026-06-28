import { useState, useEffect, useRef } from 'react'
import { Upload, Camera, Check, Sparkles, Loader2, X } from 'lucide-react'

import { CameraCaptureDialog, isLiveCameraSupported } from '@/components/camera-capture-dialog'
import { ImagePreview } from '@/components/image-preview'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { useImageUpload } from '@/hooks/use-image-upload'
import { getAccessories } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import type { AccessoryInput, AccessoryType, RecommendationImage } from '@/types/api'

// 配饰类型定义
export type { AccessoryType }

export interface AccessoryTypeInfo {
  id: AccessoryType
  name: string
  icon: string
  description: string
}

export const accessoryTypes: AccessoryTypeInfo[] = [
  { id: 'bracelet', name: '手绳/手链', icon: '📿', description: '手腕佩戴' },
]

interface AccessoryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (type: AccessoryType, selection: AccessoryInput | null) => void
  selectedType?: AccessoryType
  selectedImage?: string | null
  selectedSelection?: AccessoryInput | null
}

export function AccessoryPanel({
  open,
  onOpenChange,
  onConfirm,
  selectedType: initialType,
  selectedImage,
  selectedSelection,
}: AccessoryPanelProps) {
  const { toast } = useToast()
  const [currentType, setCurrentType] = useState<AccessoryType>(initialType || 'bracelet')
  const [selected, setSelected] = useState<AccessoryInput | null>(
    selectedSelection ?? (selectedImage ? { source: 'upload', url: selectedImage } : null)
  )
  const [presets, setPresets] = useState<RecommendationImage[]>([])
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const { uploading, uploadFile, handleFileInputChange } = useImageUpload({
    type: 'accessory',
    onUploaded: setSelected,
    errorTitle: '上传图片失败',
  })

  const selectedUrl = selected?.url ?? null

  const handleConfirm = () => {
    onConfirm(currentType, selected)
    onOpenChange(false)
  }

  useEffect(() => {
    setSelected(selectedSelection ?? (selectedImage ? { source: 'upload', url: selectedImage } : null))
  }, [selectedImage, selectedSelection])

  const handleCameraClick = () => {
    if (isLiveCameraSupported()) {
      setCameraOpen(true)
      return
    }

    cameraInputRef.current?.click()
  }

  // 从后端获取推荐图数据
  useEffect(() => {
    if (!open) return
    const fetchPresets = async () => {
      setLoading(true)
      try {
        const response = await getAccessories()
        if (response.success && response.data) {
          setPresets(response.data)
        }
      } catch (error) {
        console.error('获取配饰推荐失败', error)
        toast({
          title: '获取配饰推荐失败',
          description: error instanceof Error ? error.message : '请稍后重试',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchPresets()
  }, [open, toast])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            选择配饰
          </DrawerTitle>
          <DrawerDescription className="text-[13px]">
            选择推荐配饰或上传自己的图片
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {/* 上传区域 */}
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 h-16 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1 transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  {uploading ? '上传中...' : '上传图片'}
                </span>
              </button>
              <button
                onClick={handleCameraClick}
                disabled={uploading}
                className="flex-1 h-16 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1 transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-[10px] text-muted-foreground">{uploading ? '上传中...' : '拍照'}</span>
              </button>
            </div>
          </div>

          {selected && (
            <div className="mb-4">
              <h4 className="text-[12px] font-medium text-muted-foreground mb-2">当前选择</h4>
              <div className="relative w-24 aspect-square">
                <ImagePreview
                  src={selectedUrl ?? ''}
                  alt="当前选择的配饰"
                  triggerClassName="h-full w-full rounded-xl border-2 border-primary shadow-soft-lg"
                >
                  <img
                    src={selectedUrl ?? ''}
                    alt="当前选择的配饰"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </div>
                </ImagePreview>
                <button
                  type="button"
                  aria-label="删除当前选择的配饰"
                  onClick={() => setSelected(null)}
                  className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white shadow-soft backdrop-blur-sm transition-colors hover:bg-black/75"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* 推荐配饰 */}
          {(!loading && presets.length > 0) && (
            <div>
              <h4 className="text-[12px] font-medium text-muted-foreground mb-2">
                推荐配饰
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((item) => (
                  <ImagePreview
                    key={item.id}
                    src={item.imageUrl}
                    alt={item.title}
                    confirmLabel="选择这张配饰"
                    onConfirm={() => setSelected({
                      source: 'preset',
                      id: item.id,
                      url: item.imageUrl,
                    })}
                    triggerClassName={cn(
                      "aspect-square rounded-xl border-2 transition-all",
                      selected?.id === item.id || selectedUrl === item.imageUrl
                        ? "border-primary shadow-soft-lg"
                        : "border-transparent"
                    )}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {(selected?.id === item.id || selectedUrl === item.imageUrl) && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <span className="text-[9px] text-white font-medium truncate block">{item.title}</span>
                    </div>
                  </ImagePreview>
                ))}
              </div>
            </div>
          )}
          {/* 加载状态 */}
          {loading && (
            <div>
              <h4 className="text-[12px] font-medium text-muted-foreground mb-2">
                推荐配饰
              </h4>
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t border-border/50 pt-3">
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full h-11 rounded-xl gradient-gold text-primary-foreground font-medium"
          >
            确认选择
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full h-9 rounded-xl text-muted-foreground text-sm">
              取消
            </Button>
          </DrawerClose>
        </DrawerFooter>

        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          title="拍摄配饰"
          description="请将配饰置于画面中央，拍照后将上传为当前选择。"
          uploading={uploading}
          initialFacingMode="environment"
          onCaptureFile={uploadFile}
        />
      </DrawerContent>
    </Drawer>
  )
}