import { useState, useEffect, useRef } from 'react'
import { Upload, Camera, Check, Sparkles, Loader2 } from 'lucide-react'
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
import { getPresetAccessories, uploadImage } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import type { AccessoryResponse } from '@/types/api'

// 配饰类型定义
export type AccessoryType = 'bracelet'

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
  onConfirm: (type: AccessoryType, imageUrl: string | null) => void
  selectedType?: AccessoryType
  selectedImage?: string | null
}

export function AccessoryPanel({
  open,
  onOpenChange,
  onConfirm,
  selectedType: initialType,
  selectedImage,
}: AccessoryPanelProps) {
  const { toast } = useToast()
  const [currentType, setCurrentType] = useState<AccessoryType>(initialType || 'bracelet')
  const [selected, setSelected] = useState<string | null>(selectedImage || null)
  const [presets, setPresets] = useState<AccessoryResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleConfirm = () => {
    onConfirm(currentType, selected)
    onOpenChange(false)
  }

  const handleTypeChange = (type: AccessoryType) => {
    setCurrentType(type)
    setSelected(null) // 切换类型时清空选择
  }

  // 处理文件上传
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const response = await uploadImage(file, 'accessory')
      if (response.success && response.data) {
        const imageUrl = response.data.url
        setSelected(imageUrl)
      }
    } catch (error) {
      console.error('上传图片失败', error)
      toast({
        title: '上传图片失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      // 清空 input 以便可以再次选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 从后端获取预设数据
  useEffect(() => {
    if (!open) return
    const fetchPresets = async () => {
      setLoading(true)
      try {
        const response = await getPresetAccessories(currentType)
        if (response.success && response.data) {
          setPresets(response.data)
        }
      } catch (error) {
        console.error('获取配饰预设失败', error)
        toast({
          title: '获取配饰预设失败',
          description: error instanceof Error ? error.message : '请稍后重试',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchPresets()
  }, [open, currentType, toast])

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            选择配饰
          </DrawerTitle>
          <DrawerDescription className="text-[13px]">
            选择配饰类型和款式，或上传自己的图片
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {/* 配饰类型选择 */}
          <div className="mb-4">
            <h4 className="text-[12px] font-medium text-muted-foreground mb-2">配饰类型</h4>
            <div className="flex gap-2">
              {accessoryTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeChange(type.id)}
                  className={cn(
                    "flex-1 py-2.5 px-2 rounded-xl border-2 transition-all",
                    "flex flex-col items-center gap-1",
                    currentType === type.id
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border/60 bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className={cn(
                    "text-[11px] font-medium",
                    currentType === type.id ? "text-primary" : "text-foreground"
                  )}>
                    {type.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 上传区域 */}
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
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
              <button className="flex-1 h-16 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">拍照</span>
              </button>
            </div>
          </div>

          {selected && (
            <div className="mb-4">
              <h4 className="text-[12px] font-medium text-muted-foreground mb-2">当前选择</h4>
              <div className="relative w-24 aspect-square rounded-xl overflow-hidden border-2 border-primary shadow-soft-lg">
                <img
                  src={selected}
                  alt="当前选择的配饰"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 预设款式 */}
          <div>
            <h4 className="text-[12px] font-medium text-muted-foreground mb-2">
              热门{accessoryTypes.find(t => t.id === currentType)?.name}款式
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {presets.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item.image_url)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                      selected === item.image_url
                        ? "border-primary shadow-soft-lg"
                        : "border-transparent"
                    )}
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {selected === item.image_url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <span className="text-[9px] text-white font-medium">{item.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
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
      </DrawerContent>
    </Drawer>
  )
}
