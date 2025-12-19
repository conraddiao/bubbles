'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { SingleGroupDashboard } from '@/components/groups/single-group-dashboard'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface GroupPageProps {
  params: Promise<{
    id: string
  }>
}

function GroupContent({ params }: GroupPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  
  // Unwrap the params promise
  const resolvedParams = use(params)
  const groupId = resolvedParams.id
  
  const isNewlyCreated = searchParams.get('created') === 'true'

  useEffect(() => {
    if (isNewlyCreated && !showSuccessMessage) {
      setShowSuccessMessage(true)
      // Don't show toast here since the form already shows one
      
      // Remove the created parameter from URL after showing message
      const newUrl = `/groups/${groupId}`
      router.replace(newUrl, { scroll: false })
    }
  }, [isNewlyCreated, groupId, router, showSuccessMessage])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          {showSuccessMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">Group Created Successfully!</h3>
                <p className="text-sm text-green-600">
                  Your contact group is ready. Share the link below with participants to let them join.
                </p>
              </div>
            </div>
          )}
        </div>

        <SingleGroupDashboard groupId={groupId} />
      </div>
    </div>
  )
}

export default function GroupPage({ params }: GroupPageProps) {
  return (
    <ProtectedRoute>
      <GroupContent params={params} />
    </ProtectedRoute>
  )
}
