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

  const doVerify = useCallback(
    async (token: string) => {
      if (isVerifying) return
      setIsVerifying(true)
      try {
        const { error } = await verifyOtp(phone, token)
        if (!error) {
          onVerified()
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
          onClick={onChangeNumber}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Change number
        </button>
      </div>
    </>
  )
}
