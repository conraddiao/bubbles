'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { usePhoneAuth } from '@/hooks/use-phone-auth'
import { useAuth } from '@/hooks/use-auth'
import { isProfileComplete } from '@/lib/auth-service'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const { verifyOtp, sendOtp, isLoading, resendCooldown } = usePhoneAuth()
  const { user, profile, loading, profileFetchFailed } = useAuth()
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

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

  const doVerify = async (phoneNum: string, token: string) => {
    if (isVerifying) return
    setIsVerifying(true)
    try {
      await verifyOtp(phoneNum, token)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    await doVerify(phone, code)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    await sendOtp(phone)
  }

  const handleCodeChange = (value: string) => {
    setCode(value)
    if (value.length === 6) {
      doVerify(phone, value)
    }
  }

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
        <header className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Enter your code
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            We sent a 6-digit code to{' '}
            <span className="font-mono font-medium text-foreground">{phone}</span>
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-2">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Didn&rsquo;t receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isLoading}
              className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push('/onboarding/phone')}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Change number
          </button>
        </div>
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
