import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  active: boolean
}

function NavItem({ to, icon, label, active }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-gray-600 hover:bg-gray-100',
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const isDashboard = location.pathname === '/' || location.pathname === '/admin'
  const isUsers = location.pathname === '/users' || location.pathname.startsWith('/admin/users')
  const isRecommendations = location.pathname === '/recommendations' || location.pathname.startsWith('/admin/recommendations')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">管理后台</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem
            to="/"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 14a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>}
            label="仪表盘"
            active={isDashboard}
          />
          <NavItem
            to="/users"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4.354 4.354 0 00-4.354 4.354c0 2.064 1.637 3.747 3.75 4.354a4.354 4.354 0 01-3.75 4.354M12 4.354a4.354 4.354 0 014.354 4.354c0 2.064-1.637 3.747-3.75 4.354a4.354 4.354 0 003.75 4.354m-12-12h8a2 2 0 012 2v2a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2a2 2 0 012-2z" /></svg>}
            label="用户管理"
            active={isUsers}
          />
          <NavItem
            to="/recommendations"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>}
            label="推荐图管理"
            active={isRecommendations}
          />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m10 4a4 4 0 01-4 4H7a4 4 0 01-4-4v-4a4 4 0 014-4h10a4 4 0 014 4v4z" />
            </svg>
            退出
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isDashboard && '仪表盘'}
              {isUsers && '用户管理'}
              {isRecommendations && '推荐图管理'}
            </h2>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
