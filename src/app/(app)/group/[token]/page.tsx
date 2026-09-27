import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { showQRCard, showQRCube, showPrintSheet } from '@/flags'
import { GroupPageClient } from './group-page-client'

export const dynamic = 'force-dynamic'

interface GroupPageProps {
  params: Promise<{ token: string }>
}

export default async function GroupPage({ params }: GroupPageProps) {
  const [qrCardVisible, qrCubeVisible, printSheetVisible] = await Promise.all([
    showQRCard(),
    showQRCube(),
    showPrintSheet(),
  ])
  const cookieStore = await cookies()
  const classicCards = cookieStore.get('classic-cards')?.value === 'true'

  return (
    <Suspense>
      <GroupPageClient
        params={params}
        showQrCode={classicCards ? true : qrCardVisible}
        showCube={classicCards ? false : qrCubeVisible}
        showPrintSheet={printSheetVisible}
      />
    </Suspense>
  )
}
