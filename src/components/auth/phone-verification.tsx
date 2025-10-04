'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Phone, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { phoneVerificationSchema, PhoneVerificationFormData } from '@/lib/validations'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface PhoneVerificationProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function PhoneVerification({ onSuccess, onCancel }: PhoneVerificationProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [isLoading, setIsLoading] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const { profile, updateProfile } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PhoneVerificationFormData>({
    resolver: zodResolver(phoneVerificationSchema),
    defaultValues: {
      phone: profile?.phone || '',
    },
  })

  const currentPhone = watch('phone')

  const sendVerificationCode = async (phone: string) => {
    setIsLoading(true)
    
    try {
      // TODO: Integrate with Twilio to send SMS verification code
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPhoneNumber(phone)
      setStep('code')
      toast.success('Verification code sent to your phone')
    } catch (error) {
      toast.error('Failed to send verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async (code: string) => {
    setIsLoading(true)
    
    try {
      // TODO: Verify code with Twilio
      // For now, we'll simulate verification
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update profile with verified phone
      const { error } = await updateProfile({
        phone: phoneNumber,
        phone_verified: true,
      })

      if (error) {
        toast.error('Failed to update phone number')
        return
      }

      toast.success('Phone number verified successfully!')
      onSuccess?.()
    } catch (error) {
      toast.error('Invalid verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: PhoneVerificationFormData) => {
    if (step === 'phone') {
      await sendVerificationCode(data.phone)
    } else if (step === 'code' && data.verification_code) {
      await verifyCode(data.verification_code)
    }
  }

  const resendCode = async () => {
    if (phoneNumber) {
      await sendVerificationCode(phoneNumber)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
          <Phone className="h-6 w-6" />
          Phone Verification
        </CardTitle>
        <CardDescription className="text-center">
          {step === 'phone' 
            ? 'Enter your phone number to receive a verification code'
            : 'Enter the 6-digit code sent to your phone'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 'phone' ? (
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
              <p className="text-xs text-gray-500">
                We&apos;ll send a verification code to this number
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="verification_code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="verification_code"
                type="text"
                placeholder="123456"
                maxLength={6}
                {...register('verification_code')}
                className={errors.verification_code ? 'border-red-500' : ''}
              />
              {errors.verification_code && (
                <p className="text-sm text-red-500">{errors.verification_code.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Code sent to {phoneNumber}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 'phone' ? 'Send Code' : 'Verify Phone'}
          </Button>
        </form>

        {step === 'code' && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Didn&apos;t receive the code?
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resendCode}
              disabled={isLoading}
            >
              Resend Code
            </Button>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          
          {step === 'code' && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep('phone')
                setValue('verification_code', '')
              }}
            >
              Change Number
            </Button>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Why verify your phone?</p>
              <p>Phone verification enables SMS notifications and two-factor authentication for enhanced security.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}