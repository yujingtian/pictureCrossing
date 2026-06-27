import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { getUsers, updateUser, updateUserQuota, createUser } from '@/services/admin'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  quotaTotal: number
  quotaUsed: number
  isActive: boolean
  createdAt: string
}

interface EditDialogState {
  open: boolean
  user: User | null
}

interface QuotaDialogState {
  open: boolean
  user: User | null
}

interface CreateDialogState {
  open: boolean
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, user: null })
  const [quotaDialog, setQuotaDialog] = useState<QuotaDialogState>({ open: false, user: null })
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false })
  const [isSaving, setIsSaving] = useState(false)

  const pageSize = 20

  async function fetchUsers() {
    setIsLoading(true)
    try {
      const response = await getUsers({ page, pageSize, search })
      if (response.success && response.data) {
        setUsers(response.data.items)
        setTotal(response.data.total)
      }
    } catch (err) {
      console.error('获取用户失败', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, search])

  async function handleUpdateUser(updatedData: {
    username?: string
    email?: string
    role?: 'user' | 'admin'
    isActive?: boolean
  }) {
    if (!editDialog.user) return

    setIsSaving(true)
    try {
      const response = await updateUser(editDialog.user.id, updatedData)
      if (response.success) {
        toast.success('更新成功', { description: '用户信息已更新' })
        setEditDialog({ open: false, user: null })
        fetchUsers()
      }
    } catch (err: any) {
      toast.error('更新失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdateQuota(quotaTotal: number) {
    if (!quotaDialog.user) return

    setIsSaving(true)
    try {
      const response = await updateUserQuota(quotaDialog.user.id, quotaTotal)
      if (response.success) {
        toast.success('更新成功', { description: '用户配额已更新' })
        setQuotaDialog({ open: false, user: null })
        fetchUsers()
      }
    } catch (err: any) {
      toast.error('更新失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCreateUser(data: {
    username: string
    email: string
    password: string
    role: 'user' | 'admin'
    quotaTotal: number
    isActive: boolean
  }) {
    setIsSaving(true)
    try {
      const response = await createUser(data)
      if (response.success) {
        toast.success('创建成功', { description: '用户已创建' })
        setCreateDialog({ open: false })
        fetchUsers()
      }
    } catch (err: any) {
      toast.error('创建失败', { description: err.message || '请稍后重试' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const response = await updateUser(user.id, { isActive: !user.isActive })
      if (response.success) {
        toast.success('更新成功', { description: `用户已${!user.isActive ? '启用' : '禁用'}` })
        fetchUsers()
      }
    } catch (err: any) {
      toast.error('更新失败', { description: err.message || '请稍后重试' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">用户管理</h2>
        <div className="flex items-center gap-4">
          <Input
            type="search"
            placeholder="搜索用户名或邮箱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setCreateDialog({ open: true })}>
            新增用户
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>配额</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                    <span className="text-sm text-gray-500">加载中...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="text-gray-500">暂无用户</div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-[60px]">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              user.quotaUsed >= user.quotaTotal
                                ? 'bg-red-500'
                                : user.quotaUsed >= user.quotaTotal * 0.8
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min((user.quotaUsed / user.quotaTotal) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {user.quotaUsed} / {user.quotaTotal}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => handleToggleActive(user)}
                      />
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? '正常' : '禁用'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditDialog({ open: true, user })}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuotaDialog({ open: true, user })}
                      >
                        配额
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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

      {/* 新增用户对话框 */}
      <CreateUserDialog
        open={createDialog.open}
        isSaving={isSaving}
        onOpenChange={(open) => setCreateDialog({ open })}
        onSave={handleCreateUser}
      />

      {/* 编辑用户对话框 */}
      <EditUserDialog
        open={editDialog.open}
        user={editDialog.user}
        isSaving={isSaving}
        onOpenChange={(open) => setEditDialog({ ...editDialog, open })}
        onSave={handleUpdateUser}
      />

      {/* 调整配额对话框 */}
      <EditQuotaDialog
        open={quotaDialog.open}
        user={quotaDialog.user}
        isSaving={isSaving}
        onOpenChange={(open) => setQuotaDialog({ ...quotaDialog, open })}
        onSave={handleUpdateQuota}
      />
    </div>
  )
}

function CreateUserDialog({
  open,
  isSaving,
  onOpenChange,
  onSave,
}: {
  open: boolean
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    username: string
    email: string
    password: string
    role: 'user' | 'admin'
    quotaTotal: number
    isActive: boolean
  }) => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [quotaTotal, setQuotaTotal] = useState('10')
  const [isActive, setIsActive] = useState(true)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUsername('')
      setEmail('')
      setPassword('')
      setRole('user')
      setQuotaTotal('10')
      setIsActive(true)
    }
    onOpenChange(open)
  }

  async function handleSave() {
    const quota = parseInt(quotaTotal, 10)
    if (!isNaN(quota) && quota >= 0 && username && email && password) {
      await onSave({ username, email, password, role, quotaTotal: quota, isActive })
    }
  }

  const quotaNum = parseInt(quotaTotal, 10)
  const isValid = !isNaN(quotaNum) && quotaNum >= 0 && username && email && password

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增用户</DialogTitle>
          <DialogDescription>
            创建一个新用户
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-username">用户名 *</Label>
            <Input
              id="create-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">邮箱 *</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">密码 *</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">角色</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'user' | 'admin')}>
              <SelectTrigger id="create-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-quota">配额</Label>
            <Input
              id="create-quota"
              type="number"
              min="0"
              value={quotaTotal}
              onChange={(e) => setQuotaTotal(e.target.value)}
              placeholder="请输入配额数量"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="create-active">账号状态</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="create-active"
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
            {isSaving ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  open,
  user,
  isSaving,
  onOpenChange,
  onSave,
}: {
  open: boolean
  user: User | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { username?: string; email?: string; role?: 'user' | 'admin'; isActive?: boolean }) => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
      setRole(user.role)
      setIsActive(user.isActive)
    }
  }, [user])

  async function handleSave() {
    if (!user) return

    await onSave({
      username: username !== user.username ? username : undefined,
      email: email !== user.email ? email : undefined,
      role: role !== user.role ? role : undefined,
      isActive: isActive !== user.isActive ? isActive : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>
            修改用户 {user?.username} 的信息
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">用户名</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">邮箱</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">角色</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'user' | 'admin')}>
              <SelectTrigger id="edit-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-active">账号状态</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <span className="text-sm">{isActive ? '启用' : '禁用'}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditQuotaDialog({
  open,
  user,
  isSaving,
  onOpenChange,
  onSave,
}: {
  open: boolean
  user: User | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (quotaTotal: number) => Promise<void>
}) {
  const [quotaTotal, setQuotaTotal] = useState('')

  useEffect(() => {
    if (user) {
      setQuotaTotal(user.quotaTotal.toString())
    }
  }, [user])

  async function handleSave() {
    const quota = parseInt(quotaTotal, 10)
    if (!isNaN(quota) && quota >= 0) {
      await onSave(quota)
    }
  }

  const quotaNum = parseInt(quotaTotal, 10)
  const isValidQuota = !isNaN(quotaNum) && quotaNum >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>调整配额</DialogTitle>
          <DialogDescription>
            调整用户 {user?.username} 的生成配额
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>当前使用情况</Label>
              <span className="text-sm text-gray-500">
                {user?.quotaUsed} / {user?.quotaTotal}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  user && user.quotaUsed >= user.quotaTotal
                    ? 'bg-red-500'
                    : 'bg-green-500'
                }`}
                style={{
                  width: `${user ? Math.min((user.quotaUsed / user.quotaTotal) * 100, 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-total">新配额</Label>
            <Input
              id="quota-total"
              type="number"
              min="0"
              value={quotaTotal}
              onChange={(e) => setQuotaTotal(e.target.value)}
              placeholder="请输入配额数量"
            />
            {!isValidQuota && quotaTotal && (
              <p className="text-sm text-red-500">请输入有效的非负整数</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isValidQuota}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
