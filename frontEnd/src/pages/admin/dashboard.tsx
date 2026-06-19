import { useEffect, useState } from 'react'
import { getStats } from '@/services/admin'
import { StatsCard } from '@/components/admin/stats-card'

interface Stats {
  totalUsers: number
  activeUsersToday: number
  totalGenerations: number
  generationsToday: number
  quotaUsageRate: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await getStats()
        if (response.success && response.data) {
          setStats(response.data)
        }
      } catch (err) {
        console.error('获取统计失败', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="用户总数"
          value={stats?.totalUsers || 0}
          iconBg="bg-blue-100"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4.354 4.354 0 00-4.354 4.354c0 2.064 1.637 3.747 3.75 4.354a4.354 4.354 0 01-3.75 4.354M12 4.354a4.354 4.354 0 014.354 4.354c0 2.064-1.637 3.747-3.75 4.354a4.354 4.354 0 003.75 4.354m-12-12h8a2 2 0 012 2v2a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2a2 2 0 012-2z"/></svg>}
        />
        <StatsCard
          title="今日活跃用户"
          value={stats?.activeUsersToday || 0}
          iconBg="bg-green-100"
          icon={<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>}
        />
        <StatsCard
          title="总生成次数"
          value={stats?.totalGenerations || 0}
          iconBg="bg-amber-100"
          icon={<svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4.336 5.336l.707.707M3 12H2m1.636-6.636l.707.707M9 21h6m-9 0h-3m12 0h3m-9 0l-2 2m6-2l2 2"/></svg>}
        />
        <StatsCard
          title="今日生成次数"
          value={stats?.generationsToday || 0}
          iconBg="bg-purple-100"
          icon={<svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-4">配额使用率</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">总配额使用率</span>
                <span className="text-sm font-medium text-gray-900">
                  {stats?.quotaUsageRate || 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (stats?.quotaUsageRate || 0) > 80 ? 'bg-red-500' :
                    (stats?.quotaUsageRate || 0) > 50 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${stats?.quotaUsageRate || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-4">快速操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => window.location.href = '/admin/users'}
              className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4.354 4.354 0 00-4.354 4.354c0 2.064 1.637 3.747 3.75 4.354a4.354 4.354 0 01-3.75 4.354M12 4.354a4.354 4.354 0 014.354 4.354c0 2.064-1.637 3.747-3.75 4.354a4.354 4.354 0 003.75 4.354m-12-12h8a2 2 0 012 2v2a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2a2 2 0 012-2z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">管理用户</span>
            </button>
            <button
              onClick={() => window.location.href = '/admin/recommendations'}
              className="flex items-center justify-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">管理推荐图</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
