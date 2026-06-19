import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getUsers } from '@/services/admin'

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

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

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
                                : 'bg-amber-500'
                            }`}
                            style={{
                              width: `${Math.min((user.quotaUsed / user.quotaTotal) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {user.quotaUsed} / {user.quotaTotal}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? '正常' : '禁用'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" disabled>
                      编辑
                    </Button>
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
    </div>
  )
}
