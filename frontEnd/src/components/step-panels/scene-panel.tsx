import { useState, useEffect } from 'react'
import { Coffee, TreePine, Building2, Sparkles, Sun, Check, Loader2 } from 'lucide-react'
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
import { getPresetScenes } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import type { SceneResponse } from '@/types/api'

interface ScenePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (sceneId: string | null, lighting?: string) => void
  selectedScene?: string | null
}

const sceneCategories = [
  { id: 'cafe', name: '咖啡馆', icon: Coffee },
  { id: 'nature', name: '自然', icon: TreePine },
  { id: 'urban', name: '都市', icon: Building2 },
  { id: 'studio', name: '纯色', icon: Sparkles },
]

const lightingOptions = [
  { id: 'natural', name: '自然光' },
  { id: 'warm', name: '暖色调' },
  { id: 'cool', name: '冷色调' },
]

export function ScenePanel({ open, onOpenChange, onConfirm, selectedScene }: ScenePanelProps) {
  const { toast } = useToast()
  const [activeCategory, setActiveCategory] = useState('cafe')
  const [selected, setSelected] = useState<string | null>(selectedScene || null)
  const [selectedLighting, setSelectedLighting] = useState<string>('natural')
  const [presets, setPresets] = useState<SceneResponse[]>([])
  const [loading, setLoading] = useState(false)

  // 从后端获取预设数据
  useEffect(() => {
    if (!open) return
    const fetchPresets = async () => {
      setLoading(true)
      try {
        const response = await getPresetScenes(activeCategory)
        if (response.success && response.data) {
          setPresets(response.data)
        }
      } catch (error) {
        console.error('获取场景预设失败', error)
        toast({
          title: '获取场景预设失败',
          description: error instanceof Error ? error.message : '请稍后重试',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchPresets()
  }, [open, activeCategory, toast])

  const filteredScenes = presets.filter(s => s.category === activeCategory)

  const handleConfirm = () => {
    onConfirm(selected, selectedLighting)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg">选择场景背景</DrawerTitle>
          <DrawerDescription className="text-[13px]">
            为您的试戴效果图选择一个合适的背景场景
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {/* 分类标签 */}
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
            {sceneCategories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all",
                    activeCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {category.name}
                </button>
              )
            })}
          </div>

          {/* 场景列表 */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {filteredScenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => setSelected(scene.id)}
                  className={cn(
                    "relative aspect-[3/2] rounded-xl overflow-hidden border-2 transition-all",
                    selected === scene.id
                      ? "border-primary shadow-soft-lg"
                      : "border-transparent"
                  )}
                >
                  <img
                    src={scene.image_url}
                    alt={scene.name}
                    className="w-full h-full object-cover"
                  />
                  {selected === scene.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-[11px] text-white font-medium">{scene.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 光线调节 */}
          <div className="mt-4 p-3 rounded-xl bg-secondary/50">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-primary" />
              <span className="text-[12px] font-medium text-foreground">光线氛围</span>
            </div>
            <div className="flex gap-2">
              {lightingOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedLighting(option.id)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                    selectedLighting === option.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border/60 text-muted-foreground"
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>
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
            <Button variant="ghost" className="w-full h-10 rounded-xl text-muted-foreground">
              取消
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
