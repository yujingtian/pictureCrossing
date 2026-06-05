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

interface BraceletPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (imageUrl: string | null) => void
  selectedImage?: string | null
}

const presetBracelets = [
  { id: '1', name: '彩虹编织', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=200&h=200&fit=crop' },
  { id: '2', name: '金线串珠', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=200&h=200&fit=crop' },
  { id: '3', name: '简约皮绳', image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=200&h=200&fit=crop' },
  { id: '4', name: '复古民族', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&h=200&fit=crop' },
  { id: '5', name: '水晶手链', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop' },
  { id: '6', name: '珍珠编织', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&h=200&fit=crop' },
]

export function BraceletPanel({ open, onOpenChange, onConfirm, selectedImage }: BraceletPanelProps) {
  const [selected, setSelected] = useState<string | null>(selectedImage || null)

  const handleConfirm = () => {
    onConfirm(selected)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-lg">选择手绳款式</DrawerTitle>
          <DrawerDescription className="text-[13px]">
            从预设款式中选择，或上传自己的手绳图片
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {/* 上传区域 */}
          <div className="mb-5">
            <div className="flex gap-2">
              <button className="flex-1 h-20 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">上传图片</span>
              </button>
              <button className="flex-1 h-20 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex flex-col items-center justify-center gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">拍照</span>
              </button>
            </div>
          </div>

          {/* 预设款式 */}
          <div>
            <h4 className="text-[13px] font-medium text-foreground mb-3">热门款式</h4>
            <div className="grid grid-cols-3 gap-2.5">
              {presetBracelets.map((bracelet) => (
                <button
                  key={bracelet.id}
                  onClick={() => setSelected(bracelet.image)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    selected === bracelet.image
                      ? "border-primary shadow-soft-lg"
                      : "border-transparent"
                  )}
                >
                  <img
                    src={bracelet.image}
                    alt={bracelet.name}
                    className="w-full h-full object-cover"
                  />
                  {selected === bracelet.image && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <span className="text-[10px] text-white font-medium">{bracelet.name}</span>
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
