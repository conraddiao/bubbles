'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePhoneAuth } from '@/hooks/use-phone-auth'
import { useAuth } from '@/hooks/use-auth'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || ''
  const { verifyOtp, sendOtp, isLoading, resendCooldown } = usePhoneAuth()
  const { user, loading } = useAuth()
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // If no phone param, go back to phone entry
  useEffect(() => {
    if (!phone) {
      router.replace('/onboarding/phone')
    }
  }, [phone, router])

  // Once user session is established after OTP, go to profile
  useEffect(() => {
    if (!loading && user) {
      router.push('/onboarding/profile')
    }
  }, [loading, user, router])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    await verifyOtp(phone, code)
    // Session will be picked up by useAuth's onAuthStateChange
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    await sendOtp(phone)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
  }

  if (!phone || (user && !loading)) return null

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
          <div className="space-y-2">
            <label htmlFor="otp-code" className="text-sm font-medium">
              Verification code
            </label>
            <Input
              ref={inputRef}
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              className="text-center font-mono text-2xl tracking-[0.5em]"
            />
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
