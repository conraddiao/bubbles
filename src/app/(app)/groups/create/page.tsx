'use client'

import { useRouter } from 'next/navigation'
import { GroupCreationForm } from '@/components/groups/group-creation-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function CreateGroupPage() {
  const router = useRouter()

  const handleSuccess = (_groupId: string, shareToken: string) => {
    router.push(`/group/${shareToken}?created=true`)
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="text-center">
          <h1 className="font-display text-3xl font-bold mb-2">
            Create New Contact Group
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
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
  )
}
