'use client'

import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import { GroupDetail } from '@/components/groups/group-detail'

interface GroupPageClientProps {
  params: Promise<{ token: string }>
  showQrCode: boolean
  showCube: boolean
}

export function GroupPageClient({ params, showQrCode, showCube }: GroupPageClientProps) {
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const showSuccessToast = searchParams.get('created') === 'true'

  return (
    <GroupDetail
      token={resolvedParams.token}
      showSuccessToast={showSuccessToast}
      showQrCode={showQrCode}
      showCube={showCube}
    />
  )
}
