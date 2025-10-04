'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Shield, ShieldCheck, ShieldX, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { twoFactorSchema, TwoFactorFormData } from '@/lib/validations'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface TwoFactorSetupProps {
  onSuccess?: () => void
}

export function TwoFactorSetup({ onSuccess }: TwoFactorSetupProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const { profile, updateProfile } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  })

  const canEnable2FA = profile?.phone_verified

  const toggle2FA = async (enabled: boolean) => {
    if (!canEnable2FA) {
      toast.error('Please verify your phone number first')
      return
    }

    if (enabled) {
      // Show verification step before enabling
      setShowVerification(true)
      await sendVerificationCode()
    } else {
      // Disable 2FA directly
      await disable2FA()
    }
  }

  const sendVerificationCode = async () => {
    setIsLoading(true)
    
    try {
      // TODO: Send 2FA verification code via Twilio
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Verification code sent to your phone')
    } catch (error) {
      toast.error('Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const enable2FA = async (code: string) => {
    setIsLoading(true)
    
    try {
      // TODO: Verify code and enable 2FA
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { error } = await updateProfile({
        two_factor_enabled: true,
      })

      if (error) {
        toast.error('Failed to enable 2FA')
        return
      }

      toast.success('Two-factor authentication enabled!')
      setShowVerification(false)
      reset()
      onSuccess?.()
    } catch (error) {
      toast.error('Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const disable2FA = async () => {
    setIsLoading(true)
    
    try {
      const { error } = await updateProfile({
        two_factor_enabled: false,
      })

      if (error) {
        toast.error('Failed to disable 2FA')
        return
      }

      toast.success('Two-factor authentication disabled')
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to disable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: TwoFactorFormData) => {
    await enable2FA(data.code)
  }

  if (showVerification) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Shield className="h-6 w-6" />
            Enable 2FA
          </CardTitle>
          <CardDescription className="text-center">
            Enter the verification code sent to your phone
          </CardDescription>
        </CardHeader>
        
        <CardContent>
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
                {...register('code')}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Code sent to {profile?.phone}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowVerification(false)
                  reset()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enable 2FA
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={sendVerificationCode}
              disabled={isLoading}
            >
              Resend Code
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account with SMS-based 2FA
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {profile?.two_factor_enabled ? (
              <ShieldCheck className="h-8 w-8 text-green-600" />
            ) : (
              <ShieldX className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <h3 className="font-medium">
                SMS Two-Factor Authentication
              </h3>
              <p className="text-sm text-gray-500">
                {profile?.two_factor_enabled 
                  ? 'Enabled - Your account is protected with 2FA'
                  : 'Disabled - Enable 2FA for enhanced security'
                }
              </p>
            </div>
          </div>
          
          <Switch
            checked={profile?.two_factor_enabled || false}
            onCheckedChange={toggle2FA}
            disabled={isLoading || !canEnable2FA}
          />
        </div>

        {!canEnable2FA && (
          <Alert>
            <Phone className="h-4 w-4" />
            <AlertDescription>
              You need to verify your phone number before enabling two-factor authentication.
              <Button variant="link" className="p-0 h-auto ml-1">
                Verify phone number
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <h4 className="font-medium">How it works:</h4>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                1
              </div>
              <p>When you sign in, you&apos;ll enter your email and password as usual</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                2
              </div>
              <p>We&apos;ll send a 6-digit verification code to your phone via SMS</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                3
              </div>
              <p>Enter the code to complete your sign-in and access your account</p>
            </div>
          </div>
        </div>

        {profile?.two_factor_enabled && (
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-medium">2FA is Active</span>
            </div>
            <p className="text-sm text-green-700">
              Your account is protected with two-factor authentication. 
              You can disable it at any time, but we recommend keeping it enabled for security.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}