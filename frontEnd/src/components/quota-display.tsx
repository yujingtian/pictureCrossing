import { useEffect, useState } from 'react'
import { getQuota } from '@/services/auth'
import { useAuth } from '@/context/auth-context'

export function QuotaDisplay() {
  const { user } = useAuth()
  const [quota, setQuota] = useState<{ total: number; used: number; remaining: number } | null>(null)

  useEffect(() => {
    if (user) {
      // 优先使用用户对象中的配额信息
      setQuota({
        total: user.quotaTotal,
        used: user.quotaUsed,
        remaining: user.quotaTotal - user.quotaUsed
      })
    }

    // 同时也从 API 获取最新数据
    async function fetchQuota() {
      try {
        const response = await getQuota()
        if (response.success && response.data) {
          setQuota({
            total: response.data.quotaTotal,
            used: response.data.quotaUsed,
            remaining: response.data.quotaRemaining
          })
        }
      } catch (err) {
        // 忽略错误
      }
    }

    fetchQuota()
  }, [user])

  if (!quota) return null

  const percentage = Math.min((quota.used / quota.total) * 100, 100)

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2 text-gray-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h10a2 2 0 012 2v12a4 4 0 01-4 4h-3a2 2 0 01-2-2v-2a2 2 0 012-2h3" />
        </svg>
        <span>剩余 {quota.remaining} 次</span>
      </div>
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
