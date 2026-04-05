'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

export function AuthRedirect() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push(profile ? '/dashboard' : '/profile/setup')
    }
  }, [loading, user, profile, router])

  return null
}
