'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ProfileForm } from '@/components/auth/profile-form'
import { useAuth } from '@/hooks/use-auth'

export const dynamic = 'force-dynamic'

export default function ProfileSetupPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading && profile?.first_name && profile?.last_name) {
      router.push('/dashboard')
    }
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || (profile?.first_name && profile?.last_name)) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold mb-2">
            Complete Your Profile
          </h1>
          <p className="text-muted-foreground">
            Please provide your information to get started with Bubbles
          </p>
        </div>

        <ProfileForm mode="setup" onSuccess={() => router.push('/dashboard')} />
      </div>
    </div>
  )
}
