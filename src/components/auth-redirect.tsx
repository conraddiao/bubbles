'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { isProfileComplete } from '@/lib/auth-service'

interface AuthRedirectProps {
  mmsOnboarding?: boolean
}

export function AuthRedirect({ mmsOnboarding }: AuthRedirectProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading || !user) return

    // If mms-onboarding is active and profile is incomplete, send to profile completion
    if (mmsOnboarding && profile && !isProfileComplete(profile)) {
      router.push('/onboarding/profile')
      return
    }

    router.push('/dashboard')
  }, [loading, user, profile, router, mmsOnboarding])

  return null
}
