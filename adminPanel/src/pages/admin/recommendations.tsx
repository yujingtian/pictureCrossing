import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Upload, X, ArrowUp, ArrowDown, Image as ImageIcon, Loader2 } from 'lucide-react'
import { getRecommendations, createRecommendation, updateRecommendation, deleteRecommendation, moveRecommendationUp, moveRecommendationDown, uploadImage } from '@/services/admin'
import { toast } from 'sonner'

interface Recommendation {
  id: string
  title: string
  description?: string
  imageUrl: string
  position: string
  accessoryType?: string
  sortOrder: number
  isActive: boolean
  linkType?: string
  linkTarget?: string
  createdAt: string
  updatedAt: string
}

interface EditDialogState {
  open: boolean
  recommendation: Recommendation | null
}

interface CreateDialogState {
  open: boolean
}

interface DeleteDialogState {
  open: boolean
  recommendation: Recommendation | null
}

export function AdminRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [position, setPosition] = useState<string | undefined>(undefined)
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false })
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, recommendation: null })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, recommendation: null })
  const [isSaving, setIsSaving] = useState(false)
  const [isMoving, setIsMoving] = useState<string | null>(null)

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

  async function handleCreate(data: {
    title: string
    description?: string
    imageUrl: string
    position: string
    accessoryType?: string
    sortOrder: number
    isActive: boolean
    linkType?: string
    linkTarget?: string
  }) {
    setIsSaving(true)
    try {
      const response = await createRecommendation(data)
      if (response.success) {
        toast.success('创建成功', { description: '推荐图已创建' })
        setCreateDialog({ open: false })
        fetchRecommendations()
      }
    } catch (err: any) {
      toast.error('创建失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate(data: {
    title?: string
    description?: string
    imageUrl?: string
    position?: string
    accessoryType?: string
    sortOrder?: number
    isActive?: boolean
    linkType?: string
    linkTarget?: string
  }) {
    if (!editDialog.recommendation) return

    setIsSaving(true)
    try {
      const response = await updateRecommendation(editDialog.recommendation.id, data)
      if (response.success) {
        toast.success('更新成功', { description: '推荐图已更新' })
        setEditDialog({ open: false, recommendation: null })
        fetchRecommendations()
      }
    } catch (err: any) {
      toast.error('更新失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteDialog.recommendation) return

    setIsSaving(true)
    try {
      await deleteRecommendation(deleteDialog.recommendation.id)
      toast.success('删除成功', { description: '推荐图已删除' })
      setDeleteDialog({ open: false, recommendation: null })
      fetchRecommendations()
    } catch (err: any) {
      toast.error('删除失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleMoveUp(id: string) {
    setIsMoving(id)
    try {
      await moveRecommendationUp(id)
      toast.success('移动成功')
      fetchRecommendations()
    } catch (err: any) {
      toast.error('移动失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsMoving(null)
    }
  }

  async function handleMoveDown(id: string) {
    setIsMoving(id)
    try {
      await moveRecommendationDown(id)
      toast.success('移动成功')
      fetchRecommendations()
    } catch (err: any) {
      toast.error('移动失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsMoving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">推荐图管理</h2>
        <div className="flex items-center gap-4">
          <Select value={position} onValueChange={(val) => setPosition(val === 'all' ? undefined : val)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部位置" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部位置</SelectItem>
              <SelectItem value="home">首页</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateDialog({ open: true })}>
            新增推荐图
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2" />
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
                      <ImageIcon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {!rec.isActive && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
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
                <CardFooter className="pt-2 border-t flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveUp(rec.id)}
                    disabled={isMoving === rec.id}
                  >
                    {isMoving === rec.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveDown(rec.id)}
                    disabled={isMoving === rec.id}
                  >
                    {isMoving === rec.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditDialog({ open: true, recommendation: rec })}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialog({ open: true, recommendation: rec })}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    删除
                  </Button>
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

      {/* 新增推荐图对话框 */}
      <RecommendationFormDialog
        open={createDialog.open}
        isSaving={isSaving}
        onOpenChange={(open) => setCreateDialog({ open })}
        onSave={handleCreate}
      />

      {/* 编辑推荐图对话框 */}
      <RecommendationFormDialog
        open={editDialog.open}
        recommendation={editDialog.recommendation}
        isSaving={isSaving}
        onOpenChange={(open) => setEditDialog({ open, recommendation: editDialog.recommendation })}
        onSave={handleUpdate}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除推荐图「{deleteDialog.recommendation?.title}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface RecommendationFormDialogProps {
  open: boolean
  recommendation?: Recommendation | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => Promise<void>
}

function RecommendationFormDialog({ open, recommendation, isSaving, onOpenChange, onSave }: RecommendationFormDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [position, setPosition] = useState('home')
  const [accessoryType, setAccessoryType] = useState<string | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [linkType, setLinkType] = useState('')
  const [linkTarget, setLinkTarget] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!recommendation

  useEffect(() => {
    if (open) {
      if (recommendation) {
        setTitle(recommendation.title)
        setDescription(recommendation.description || '')
        setImageUrl(recommendation.imageUrl)
        setPosition(recommendation.position)
        setAccessoryType(recommendation.accessoryType || undefined)
        setSortOrder(recommendation.sortOrder.toString())
        setIsActive(recommendation.isActive)
        setLinkType(recommendation.linkType || '')
        setLinkTarget(recommendation.linkTarget || '')
      } else {
        setTitle('')
        setDescription('')
        setImageUrl('')
        setPosition('home')
        setAccessoryType(undefined)
        setSortOrder('0')
        setIsActive(true)
        setLinkType('')
        setLinkTarget('')
      }
    }
  }, [open, recommendation])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle('')
      setDescription('')
      setImageUrl('')
      setPosition('home')
      setAccessoryType(undefined)
      setSortOrder('0')
      setIsActive(true)
      setLinkType('')
      setLinkTarget('')
    }
    onOpenChange(open)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const response = await uploadImage(file, 'model')
      if (response.success && response.data) {
        setImageUrl(response.data.url)
        toast.success('上传成功')
      }
    } catch (err: any) {
      toast.error('上传失败', { description: err.message || '请稍后重试' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    const sortOrderNum = parseInt(sortOrder, 10)
    if (isNaN(sortOrderNum) || sortOrderNum < 0) {
      toast.error('请输入有效的排序值')
      return
    }
    if (!title.trim()) {
      toast.error('请输入标题')
      return
    }
    if (!imageUrl.trim()) {
      toast.error('请上传或输入图片地址')
      return
    }

    const data: any = {
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      position,
      sortOrder: sortOrderNum,
      isActive,
    }

    if (description.trim()) {
      data.description = description.trim()
    }
    if (accessoryType && accessoryType !== 'none') {
      data.accessoryType = accessoryType
    }
    if (linkType.trim()) {
      data.linkType = linkType.trim()
    }
    if (linkTarget.trim()) {
      data.linkTarget = linkTarget.trim()
    }

    await onSave(data)
  }

  const isValid = title.trim() && imageUrl.trim() && !isNaN(parseInt(sortOrder, 10)) && parseInt(sortOrder, 10) >= 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑推荐图' : '新增推荐图'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改推荐图信息' : '创建一个新的推荐图'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 图片上传/预览 */}
          <div className="space-y-2">
            <Label>推荐图片</Label>
            <div className="flex flex-col gap-3">
              {imageUrl && (
                <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden">
                  <img src={imageUrl} alt="预览" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/75"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      上传图片
                    </>
                  )}
                </Button>
              </div>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="或输入图片 URL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入推荐图标题"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入推荐图描述"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">位置</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger id="position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">首页</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="排序值"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessoryType">配饰类型</Label>
            <Select value={accessoryType} onValueChange={(val) => setAccessoryType(val === 'none' ? undefined : val)}>
              <SelectTrigger id="accessoryType">
                <SelectValue placeholder="选择配饰类型（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                <SelectItem value="bracelet">手链</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkType">链接类型</Label>
              <Input
                id="linkType"
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                placeholder="可选"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkTarget">链接目标</Label>
              <Input
                id="linkTarget"
                value={linkTarget}
                onChange={(e) => setLinkTarget(e.target.value)}
                placeholder="可选"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">启用状态</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <span className="text-sm">{isActive ? '启用' : '禁用'}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isValid}>
            {isSaving ? '保存中...' : (isEdit ? '保存' : '创建')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
