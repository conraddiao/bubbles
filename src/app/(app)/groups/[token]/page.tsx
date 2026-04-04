'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { SingleGroupDashboard } from '@/components/groups/single-group-dashboard'

export const dynamic = 'force-dynamic'

interface GroupPageProps {
  params: Promise<{
    token: string
  }>
}

export default function GroupPage({ params }: GroupPageProps) {
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const token = resolvedParams.token
  const showSuccessToast = searchParams.get('created') === 'true'

  return <SingleGroupDashboard token={token} showSuccessToast={showSuccessToast} />
}
