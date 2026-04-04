'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { SingleGroupDashboard } from '@/components/groups/single-group-dashboard'

interface GroupPageClientProps {
  params: Promise<{ id: string }>
  showQrCode: boolean
  showCube: boolean
}

export function GroupPageClient({ params, showQrCode, showCube }: GroupPageClientProps) {
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const showSuccessToast = searchParams.get('created') === 'true'

  return (
    <SingleGroupDashboard
      groupId={resolvedParams.id}
      showSuccessToast={showSuccessToast}
      showQrCode={showQrCode}
      showCube={showCube}
    />
  )
}
