'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { twoFactorSchema, TwoFactorFormData } from '@/lib/validations'
import { toast } from 'sonner'

interface TwoFactorVerificationProps {
  email: string
  onSuccess: () => void
  onBack: () => void
}

export function TwoFactorVerification({ email, onSuccess, onBack }: TwoFactorVerificationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  })

  const onSubmit = async (data: TwoFactorFormData) => {
    setIsLoading(true)
    
    try {
      // TODO: Verify 2FA code with backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Simulate successful verification
      toast.success('Successfully verified!')
      onSuccess()
    } catch (error) {
      toast.error('Invalid verification code. Please try again.')
      reset()
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    if (resendCooldown > 0) return

    setIsLoading(true)
    
    try {
      // TODO: Resend 2FA code
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Verification code sent')
      
      // Start cooldown
      setResendCooldown(30)
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      toast.error('Failed to resend code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
          <Shield className="h-6 w-6" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription className="text-center">
          Enter the 6-digit code sent to your phone to complete sign-in
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Signing in as:</strong> {email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Verification Code
            </label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              maxLength={6}
              autoComplete="one-time-code"
              {...register('code')}
              className={errors.code ? 'border-red-500' : ''}
              autoFocus
            />
            {errors.code && (
              <p className="text-sm text-red-500">{errors.code.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & Sign In
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn&apos;t receive the code?
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resendCode}
              disabled={isLoading || resendCooldown > 0}
            >
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s`
                : 'Resend Code'
              }
            </Button>
          </div>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onBack}
              className="text-gray-500"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to Sign In
            </Button>
          </div>
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Having trouble?</strong> Make sure your phone can receive SMS messages and check your spam folder. 
            If you&apos;re still having issues, contact support.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}