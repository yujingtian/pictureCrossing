import { useState, useEffect, useRef } from 'react'
import { Upload, Camera, Check, User, Loader2 } from 'lucide-react'
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
import { getPresetModels, uploadImage } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import type { AccessoryType, ModelInput, ModelResponse } from '@/types/api'

// 模特分类定义
interface ModelCategory {
  id: string
  name: string
  icon: string
}

// 模特分类
const modelCategories: ModelCategory[] = [
  { id: 'wrist', name: '手腕', icon: '✋' },
]

// 配饰类型对应的推荐分类
const recommendedCategoryByType: Record<AccessoryType, string> = {
  bracelet: 'wrist',
}

interface ModelPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selection: ModelInput | null) => void
  selectedImage?: string | null
  selectedSelection?: ModelInput | null
  accessoryType?: AccessoryType
}

export function ModelPanel({
  open,
  onOpenChange,
  onConfirm,
  selectedImage,
  selectedSelection,
  accessoryType = 'bracelet',
}: ModelPanelProps) {
  const { toast } = useToast()
  const [selected, setSelected] = useState<ModelInput | null>(
    selectedSelection ?? (selectedImage ? { source: 'upload', url: selectedImage } : null)
  )
  const [presets, setPresets] = useState<ModelResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 默认为推荐分类，但用户可以切换
  const [activeCategory, setActiveCategory] = useState<string>(
    recommendedCategoryByType[accessoryType]
  )

  // 当配饰类型变化时，更新推荐分类
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
  }

  // 处理文件上传
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const response = await uploadImage(file, 'model')
      if (response.success && response.data) {
        setSelected({
          source: 'upload',
          id: response.data.file_id,
          url: response.data.url,
        })
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

  const selectedUrl = selected?.url ?? null

  const handleConfirm = () => {
    onConfirm(selected)
    onOpenChange(false)
  }

  // 从后端获取预设数据
  useEffect(() => {
    if (!open) return
    const fetchPresets = async () => {
      setLoading(true)
      try {
        const response = await getPresetModels(activeCategory)
        if (response.success && response.data) {
          setPresets(response.data)
        }
      } catch (error) {
        console.error('获取模特预设失败', error)
        toast({
          title: '获取模特预设失败',
          description: error instanceof Error ? error.message : '请稍后重试',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchPresets()
  }, [open, activeCategory, toast])

  // 获取当前分类的模特
  const filteredModels = presets.filter(m => m.category === activeCategory)
  // 获取所有模特
  const allModels = presets

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            选择模特
          </DrawerTitle>
          <DrawerDescription className="text-[13px]">
            选择任意模特，或上传您自己的照片
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
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
                className="flex-1 h-20 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1 transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  {uploading ? '上传中...' : '上传照片'}
                </span>
                <span className="text-[9px] text-muted-foreground/70">支持任意部位</span>
              </button>
              <button className="flex-1 h-20 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">拍照</span>
                <span className="text-[9px] text-muted-foreground/70">实时拍摄</span>
              </button>
            </div>
          </div>

          {selected && (
            <div className="mb-4">
              <h4 className="text-[12px] font-medium text-muted-foreground mb-2">当前选择</h4>
              <ImagePreview
                src={selectedUrl ?? ''}
                alt="当前选择的模特"
                triggerClassName="w-32 aspect-[4/3] rounded-xl border-2 border-primary shadow-soft-lg"
              >
                <img
                  src={selectedUrl ?? ''}
                  alt="当前选择的模特"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              </ImagePreview>
            </div>
          )}

          {/* 模特分类选择 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[12px] font-medium text-muted-foreground">模特分类</h4>
              <button
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-full transition-colors",
                  activeCategory === 'all'
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                查看全部
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {modelCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all",
                    activeCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* 推荐提示 */}
          {activeCategory === recommendedCategoryByType[accessoryType] && (
            <div className="mb-4 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-[10px] text-primary/90 leading-relaxed">
                💡 此分类最适合您当前选择的配饰
              </p>
            </div>
          )}

          {/* 模特列表 */}
          <div>
            <h4 className="text-[12px] font-medium text-muted-foreground mb-2">
              {activeCategory === 'all'
                ? '全部模特'
                : `${modelCategories.find(c => c.id === activeCategory)?.name}模特`}
            </h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(activeCategory === 'all' ? allModels : filteredModels).map((model) => (
                  <ImagePreview
                    key={model.id}
                    src={model.image_url}
                    alt={model.name}
                    onOpenPreview={() => setSelected({
                      source: 'preset',
                      id: model.id,
                      url: model.image_url,
                    })}
                    triggerClassName={cn(
                      "aspect-[4/3] rounded-xl border-2 transition-all",
                      selectedUrl === model.image_url
                        ? "border-primary shadow-soft-lg"
                        : "border-transparent"
                    )}
                  >
                    <img
                      src={model.image_url}
                      alt={model.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedUrl === model.image_url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <span className="text-[10px] text-white font-medium">{model.name}</span>
                    </div>
                  </ImagePreview>
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
