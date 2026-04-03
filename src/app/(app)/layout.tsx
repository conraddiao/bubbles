'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { isProfileComplete } from '@/lib/auth-service'
import { AppHeader } from '@/components/app-header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth')
        return
      }
      if (!isProfileComplete(profile) && pathname !== '/profile/setup') {
        router.push('/profile/setup')
      }
    }
  }, [user, profile, loading, router, pathname])

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

  // Allow profile setup page when profile is incomplete
  if (!isProfileComplete(profile) && pathname !== '/profile/setup') {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50">
        <AppHeader />
      </div>
      <main>{children}</main>
    </div>
  )
}
