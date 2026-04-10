'use client'

import { Suspense, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { isProfileComplete } from '@/lib/auth-service'
import { OTPVerifyForm } from '@/components/otp-verify-form'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const { user, profile, loading, profileFetchFailed } = useAuth()

  // If no phone param, go back to phone entry
  useEffect(() => {
    if (!phone) {
      router.replace('/onboarding/phone')
    }
  }, [phone, router])

  // Once user session is established after OTP, go to profile or dashboard
  // Profile fetches in the background after auth — wait for it before deciding
  useEffect(() => {
    if (!loading && user && (profile || profileFetchFailed)) {
      if (isProfileComplete(profile)) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding/profile')
      }
    }
  }, [loading, user, profile, profileFetchFailed, router])

  const handleVerified = useCallback(() => {
    // Auth state change triggers the useEffect above to route
  }, [])

  const handleChangeNumber = useCallback(() => {
    router.push('/onboarding/phone')
  }, [router])

  if (!phone) return null

  // Show spinner while waiting for profile to load after auth
  if (user && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <OTPVerifyForm
          phone={phone}
          onVerified={handleVerified}
          onChangeNumber={handleChangeNumber}
        />
      </main>
    </div>
  )
}

export default function OnboardingVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
