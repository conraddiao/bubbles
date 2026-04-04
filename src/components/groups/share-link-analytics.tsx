'use client'

import { useQuery } from '@tanstack/react-query'
import { Eye, Users, TrendingUp } from 'lucide-react'
import { getShareLinkAnalytics } from '@/lib/database'

interface ShareLinkAnalyticsProps {
  groupId: string
}

interface AnalyticsData {
  total_views: number
  unique_views: number
  anonymous_views: number
  views_last_7_days: number
  views_last_30_days: number
  daily_views: { date: string; views: number }[]
  top_referrers: { source: string; views: number }[]
  total_members: number
}

export function ShareLinkAnalytics({ groupId }: ShareLinkAnalyticsProps) {
  const { data: analytics, isLoading } = useQuery<AnalyticsData | null>({
    queryKey: ['share-link-analytics', groupId],
    queryFn: async () => {
      const result = await getShareLinkAnalytics(groupId)
      if (result.error) throw new Error(result.error)
      return result.data as AnalyticsData
    },
    enabled: !!groupId,
  })

  if (isLoading || !analytics) return null
  if (analytics.total_views === 0) return null

  const conversionRate =
    analytics.total_views > 0
      ? Math.round((analytics.total_members / analytics.total_views) * 100)
      : 0

  const maxDailyViews = Math.max(...(analytics.daily_views?.map((d) => d.views) ?? [1]), 1)

  return (
    <div className="space-y-3">
      <h3 className="font-label text-xs font-semibold uppercase tracking-wide text-[#7A6E63]">
        Share link activity
      </h3>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<Eye className="h-3.5 w-3.5" />} label="Views" value={analytics.total_views} />
        <StatCard icon={<Users className="h-3.5 w-3.5" />} label="Joined" value={analytics.total_members} />
        <StatCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Conversion" value={`${conversionRate}%`} />
      </div>

      {/* Sparkline — last 30 days */}
      {analytics.daily_views && analytics.daily_views.length > 1 && (
        <div className="rounded-xl border border-[#E0D5C5] bg-[#FEFAF4] p-3">
          <p className="mb-2 text-xs text-[#7A6E63]">Last 30 days</p>
          <div className="flex items-end gap-[2px]" style={{ height: 40 }}>
            {analytics.daily_views.map((d) => (
              <div
                key={d.date}
                className="flex-1 rounded-sm bg-[#E8622A]"
                style={{
                  height: `${Math.max((d.views / maxDailyViews) * 100, 8)}%`,
                  opacity: 0.6 + (d.views / maxDailyViews) * 0.4,
                }}
                title={`${d.date}: ${d.views} view${d.views !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top referrers */}
      {analytics.top_referrers && analytics.top_referrers.length > 0 && (
        <div className="rounded-xl border border-[#E0D5C5] bg-[#FEFAF4] p-3">
          <p className="mb-2 text-xs text-[#7A6E63]">Top sources</p>
          <div className="space-y-1.5">
            {analytics.top_referrers.map((r) => (
              <div key={r.source} className="flex items-center justify-between text-sm">
                <span className="truncate text-[#1C1713]">
                  {formatReferrer(r.source)}
                </span>
                <span className="ml-2 tabular-nums text-[#7A6E63]">{r.views}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-[#E0D5C5] bg-[#FEFAF4] px-3 py-2 text-center">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[#7A6E63]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-label text-lg font-semibold text-[#1C1713]">{value}</p>
    </div>
  )
}

function formatReferrer(source: string): string {
  if (source === 'direct') return 'Direct / QR'
  try {
    return new URL(source).hostname.replace('www.', '')
  } catch {
    return source
  }
}
