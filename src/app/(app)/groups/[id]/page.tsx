import { Suspense } from 'react'
import { showQrCode, showCube } from '@/flags'
import { GroupPageClient } from './group-page-client'

export const dynamic = 'force-dynamic'

interface GroupPageProps {
  params: Promise<{ id: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const [qrCodeVisible, cubeVisible] = await Promise.all([showQrCode(), showCube()])

  return (
    <Suspense>
      <GroupPageClient
        params={params}
        showQrCode={qrCodeVisible}
        showCube={cubeVisible}
      />
    </Suspense>
  )
}
