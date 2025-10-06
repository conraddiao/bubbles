'use client'

import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { GroupCreationForm } from '@/components/groups/group-creation-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function CreateGroupContent() {
  const router = useRouter()

  const handleSuccess = (groupId: string) => {
    // Redirect to the group dashboard or show success page
    router.push(`/groups/${groupId}?created=true`)
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Create New Contact Group
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Set up a new contact group to collect and share contact information with your participants.
              You&apos;ll get a shareable link that others can use to join.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <GroupCreationForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  )
}

export default function CreateGroupPage() {
  return (
    <ProtectedRoute>
      <CreateGroupContent />
    </ProtectedRoute>
  )
}