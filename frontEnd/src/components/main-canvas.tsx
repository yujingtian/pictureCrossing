import { Sparkles, ImagePlus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ImagePreview } from '@/components/image-preview'
import { getRecommendations } from '@/services/api'
import type { RecommendationImage as RecommendationImageType } from '@/types/api'
import { cn } from '@/lib/utils'

interface MainCanvasProps {
  imageUrl?: string | null
  isLoading?: boolean
}

export function MainCanvas({ imageUrl, isLoading }: MainCanvasProps) {
  const [recommendations, setRecommendations] = useState<RecommendationImageType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoadingRecs, setIsLoadingRecs] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await getRecommendations('home')
        if (response.success && response.data) {
          setRecommendations(response.data as RecommendationImageType[])
        }
      } catch (err) {
        console.error('获取推荐图失败', err)
      } finally {
        setIsLoadingRecs(false)
      }
    }
    fetchRecommendations()
  }, [])

  const hasRecommendations = recommendations.length > 0
  const currentRecommendation = hasRecommendations ? recommendations[currentIndex] : null

  const nextSlide = () => {
    if (hasRecommendations) {
      setCurrentIndex((prev) => (prev + 1) % recommendations.length)
    }
  }

  const prevSlide = () => {
    if (hasRecommendations) {
      setCurrentIndex((prev) => (prev - 1 + recommendations.length) % recommendations.length)
    }
  }

  return (
    <div className="px-4 h-full">
      <div
        className={cn(
          "relative w-full h-full max-h-[50vh] mx-auto rounded-3xl overflow-hidden",
          "bg-gradient-to-b from-secondary/80 to-muted/60",
          "border-2 border-dashed border-border/80",
          "shadow-soft transition-all duration-300",
          imageUrl && "border-solid border-primary/40"
        )}
        style={{ aspectRatio: '4/5' }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-foreground/85 animate-pulse">
                AI 正在生成试戴效果
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                高清图片生成通常需要 30 秒到 1 分钟，请保持页面打开，完成后将自动展示结果。
              </p>
            </div>
            <div className="grid w-full max-w-56 gap-1.5 text-left text-[11px] text-muted-foreground">
              <div className="rounded-full bg-card/75 px-3 py-1.5 shadow-soft">✓ 已提交素材</div>
              <div className="rounded-full bg-card/75 px-3 py-1.5 shadow-soft">✓ 正在融合配饰与模特</div>
              <div className="rounded-full bg-card/75 px-3 py-1.5 shadow-soft">🖼️ 生成完成后自动刷新</div>
            </div>
          </div>
        ) : imageUrl ? (
          <ImagePreview
            src={imageUrl}
            alt="试戴效果图"
            triggerClassName="h-full w-full rounded-3xl"
          >
            <img
              src={imageUrl}
              alt="试戴效果图"
              className="h-full w-full object-cover"
            />
          </ImagePreview>
        ) : hasRecommendations && currentRecommendation ? (
          <div className="relative w-full h-full group">
            {/* 推荐图片 */}
            <img
              key={currentRecommendation.id}
              src={currentRecommendation.imageUrl}
              alt={currentRecommendation.title}
              className="w-full h-full object-cover transition-opacity duration-500"
            />

            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* 内容 */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="text-lg font-semibold mb-1">{currentRecommendation.title}</h3>
              {currentRecommendation.description && (
                <p className="text-sm text-white/80 line-clamp-2">{currentRecommendation.description}</p>
              )}
            </div>

            {/* 导航按钮 - 只在有多个推荐图时显示 */}
            {recommendations.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  aria-label="上一张"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                  aria-label="下一张"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* 指示器 */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {recommendations.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        index === currentIndex ? "bg-white w-4" : "bg-white/50"
                      )}
                      aria-label={`跳转到第 ${index + 1} 张`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            {/* 装饰性背景元素 */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-[15%] left-[20%] w-20 h-20 rounded-full bg-primary/5 blur-2xl" />
              <div className="absolute bottom-[25%] right-[15%] w-24 h-24 rounded-full bg-accent/10 blur-2xl" />
              <div className="absolute top-[40%] right-[25%] w-16 h-16 rounded-full bg-primary/8 blur-xl" />
            </div>

            {/* 主要提示内容 */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-card shadow-soft flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-primary/70" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-medium text-foreground/80 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  上传元素，见证魔法
                </p>
                <p className="text-xs text-muted-foreground">
                  选择配饰和模特后生成试戴效果图
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
