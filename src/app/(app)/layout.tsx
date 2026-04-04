'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { isProfileComplete } from '@/lib/auth-service'
import { AppHeader } from '@/components/app-header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileFetchFailed, retryProfile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth')
        return
      }
      // Only redirect to setup if profile is genuinely incomplete — not if the fetch failed
      if (!profileFetchFailed && !isProfileComplete(profile) && pathname !== '/profile/setup') {
        router.push('/profile/setup')
      }
    }
  }, [user, profile, loading, profileFetchFailed, router, pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Show retry UI when profile failed to load rather than silently redirecting to setup
  if (profileFetchFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Unable to load your profile. Please try again.</p>
        <button
          onClick={retryProfile}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  // Allow profile setup page when profile is incomplete
  if (!isProfileComplete(profile) && pathname !== '/profile/setup') {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background">
        <AppHeader />
      </div>
      <main className="pt-[61px]">{children}</main>
    </div>
  )
}
