'use client'

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp'
import { usePhoneAuth } from '@/hooks/use-phone-auth'

interface OTPVerifyFormProps {
  phone: string
  onVerified: () => void
  onChangeNumber: () => void
  title?: string
  subtitle?: string
}

export function OTPVerifyForm({
  phone,
  onVerified,
  onChangeNumber,
  title = 'Enter your code',
  subtitle,
}: OTPVerifyFormProps) {
  const { verifyOtp, sendOtp, isLoading, resendCooldown } = usePhoneAuth()
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [hasError, setHasError] = useState(false)

  const doVerify = useCallback(
    async (token: string) => {
      if (isVerifying) return
      setIsVerifying(true)
      try {
        const { error } = await verifyOtp(phone, token)
        if (!error) {
          onVerified()
        } else {
          // Clear the entry so the (now consumed/expired) code can't be
          // re-submitted, and flag the field invalid. Supabase invalidates the
          // OTP after repeated failed attempts, so a fresh entry/resend is needed.
          setHasError(true)
          setCode('')
        }
      } finally {
        setIsVerifying(false)
      }
    },
    [isVerifying, verifyOtp, phone, onVerified]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    await doVerify(code)
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    await sendOtp(phone)
  }

  const handleCodeChange = (value: string) => {
    setCode(value)
    if (hasError) setHasError(false)
    if (value.length === 6) {
      doVerify(value)
    }
  }

  return (
    <>
      <header className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {subtitle || (
            <>
              We sent a 6-digit code to{' '}
              <span className="font-mono font-medium text-foreground">{phone}</span>
            </>
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center gap-2">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={handleCodeChange}
            autoFocus
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} aria-invalid={hasError || undefined} />
              <InputOTPSlot index={1} aria-invalid={hasError || undefined} />
              <InputOTPSlot index={2} aria-invalid={hasError || undefined} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} aria-invalid={hasError || undefined} />
              <InputOTPSlot index={4} aria-invalid={hasError || undefined} />
              <InputOTPSlot index={5} aria-invalid={hasError || undefined} />
            </InputOTPGroup>
          </InputOTP>
          {hasError && (
            <p className="text-sm text-destructive" role="alert">
              Incorrect or expired code — request a new one below.
            </p>
          )}
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
          onClick={onChangeNumber}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Change number
        </button>
        <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
          Codes can take a moment to arrive. Check that{' '}
          <span className="font-mono">{phone}</span> is correct — if it isn&rsquo;t, use
          &ldquo;Change number&rdquo; — then resend.
        </p>
      </div>
    </>
  )
}
