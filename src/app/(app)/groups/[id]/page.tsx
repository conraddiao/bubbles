'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SingleGroupDashboard } from '@/components/groups/single-group-dashboard'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface GroupPageProps {
  params: Promise<{
    id: string
  }>
}

export default function GroupPage({ params }: GroupPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const resolvedParams = use(params)
  const groupId = resolvedParams.id

  const isNewlyCreated = searchParams.get('created') === 'true'

  useEffect(() => {
    if (isNewlyCreated && !showSuccessMessage) {
      setShowSuccessMessage(true)
      const newUrl = `/groups/${groupId}`
      router.replace(newUrl, { scroll: false })
    }
  }, [isNewlyCreated, groupId, router, showSuccessMessage])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-[#D1FAE5] border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#065F46]" />
            <div>
              <h3 className="font-medium text-[#065F46]">Group Created Successfully!</h3>
              <p className="text-sm text-[#065F46]/80">
                Your contact group is ready. Share the link below with participants to let them join.
              </p>
            </div>
          </div>
        )}
      </div>

      <SingleGroupDashboard groupId={groupId} />
    </div>
  )
}
