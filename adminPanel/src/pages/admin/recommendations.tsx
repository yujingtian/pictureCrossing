import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { getRecommendations } from '@/services/admin'

interface Recommendation {
  id: string
  title: string
  description?: string
  imageUrl: string
  position: string
  accessoryType?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export function AdminRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [position, setPosition] = useState<string>('')

  const pageSize = 20

  async function fetchRecommendations() {
    setIsLoading(true)
    try {
      const response = await getRecommendations({ page, pageSize, position: position || undefined })
      if (response.success && response.data) {
        setRecommendations(response.data.items)
        setTotal(response.data.total)
      }
    } catch (err) {
      console.error('获取推荐图失败', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [page, position])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">推荐图管理</h2>
        <Button disabled>
          新增推荐图
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
          <span className="text-gray-500">加载中...</span>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          暂无推荐图
        </div>
      ) : (
        <>
          {/* 推荐图网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="overflow-hidden">
                <div className="aspect-[16/9] bg-gray-100 relative">
                  {rec.imageUrl ? (
                    <img
                      src={rec.imageUrl}
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {!rec.isActive && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-medium">已禁用</span>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                  {rec.description && (
                    <CardDescription className="line-clamp-2">{rec.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>位置：{rec.position}</span>
                      <span>排序：{rec.sortOrder}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" disabled>编辑</Button>
                  <Button variant="ghost" size="sm" disabled>删除</Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          {Math.ceil(total / pageSize) > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                共 {total} 条记录
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                  上一页
                </Button>
                <span className="text-sm text-gray-500">
                  第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
                </span>
                <Button variant="ghost" size="sm" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / pageSize)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
