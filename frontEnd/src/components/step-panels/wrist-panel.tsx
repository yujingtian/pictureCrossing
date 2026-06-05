import { useState } from 'react'
import { Upload, Camera, Check } from 'lucide-react'
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

interface WristPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (imageUrl: string | null) => void
  selectedImage?: string | null
}

const presetWrists = [
  { id: '1', name: '纤细手腕', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop' },
  { id: '2', name: '优雅姿态', image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=200&h=200&fit=crop' },
  { id: '3', name: '自然随性', image: 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=200&h=200&fit=crop' },
  { id: '4', name: '温柔气质', image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=200&h=200&fit=crop' },
]

export function WristPanel({ open, onOpenChange, onConfirm, selectedImage }: WristPanelProps) {
  const [selected, setSelected] = useState<string | null>(selectedImage || null)

  const handleConfirm = () => {
    onConfirm(selected)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg">选择模特手部</DrawerTitle>
          <DrawerDescription className="text-[13px]">
            上传您的手腕照片，或选择预设模特
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {/* 上传区域 */}
          <div className="mb-5">
            <div className="flex gap-2">
              <button className="flex-1 h-24 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">上传手腕照片</span>
                <span className="text-[10px] text-muted-foreground/70">建议清晰露出手腕</span>
              </button>
              <button className="flex-1 h-24 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">拍照</span>
                <span className="text-[10px] text-muted-foreground/70">实时拍摄</span>
              </button>
            </div>
          </div>

          {/* 拍摄提示 */}
          <div className="mb-5 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-[11px] text-primary/90 leading-relaxed">
              拍摄建议：手腕正面朝上，光线充足，背景简洁。这样能获得更好的试戴效果。
            </p>
          </div>

          {/* 预设模特 */}
          <div>
            <h4 className="text-[13px] font-medium text-foreground mb-3">预设模特</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {presetWrists.map((wrist) => (
                <button
                  key={wrist.id}
                  onClick={() => setSelected(wrist.image)}
                  className={cn(
                    "relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all",
                    selected === wrist.image
                      ? "border-primary shadow-soft-lg"
                      : "border-transparent"
                  )}
                >
                  <img
                    src={wrist.image}
                    alt={wrist.name}
                    className="w-full h-full object-cover"
                  />
                  {selected === wrist.image && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span className="text-[11px] text-white font-medium">{wrist.name}</span>
                  </div>
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
