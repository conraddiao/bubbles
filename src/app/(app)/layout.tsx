'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { isProfileComplete } from '@/lib/auth-service'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileFetchFailed, retryProfile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  // Redirect phone-auth users with incomplete profiles to onboarding
  useEffect(() => {
    if (!loading && user && profile && !isProfileComplete(profile)) {
      router.push('/onboarding/profile')
    }
  }, [loading, user, profile, router])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Show retry UI when profile failed to load
  if (profileFetchFailed) {
    return (
      <div className="flex min-h-dvh bg-background items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Unable to load your profile. Please try again.</p>
        <Button onClick={retryProfile}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background">
        <AppHeader />
      </div>
      <main className="pt-[61px]">{children}</main>
    </div>
  )
}
