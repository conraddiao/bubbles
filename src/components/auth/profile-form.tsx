'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, User, Phone, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { profileUpdateSchema, ProfileUpdateFormData } from '@/lib/validations'

interface ProfileFormProps {
  onSuccess?: () => void
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { profile, updateProfile } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      sms_notifications_enabled: profile?.sms_notifications_enabled ?? true,
    },
  })

  const smsNotificationsEnabled = watch('sms_notifications_enabled')

  const onSubmit = async (data: ProfileUpdateFormData) => {
    setIsLoading(true)
    
    try {
      const { error } = await updateProfile(data)
      
      if (!error) {
        onSuccess?.()
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Settings
        </CardTitle>
        <CardDescription>
          Update your profile information. Changes will be reflected across all your groups.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter your full name"
                {...register('full_name')}
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Required for SMS notifications and two-factor authentication
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label htmlFor="sms_notifications" className="text-sm font-medium">
                    SMS Notifications
                  </label>
                  <p className="text-xs text-gray-500">
                    Receive text messages for group updates and important notifications
                  </p>
                </div>
                <Switch
                  id="sms_notifications"
                  checked={smsNotificationsEnabled}
                  onCheckedChange={(checked) => setValue('sms_notifications_enabled', checked)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Account Information</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Phone Verified:</strong> {profile.phone_verified ? 'Yes' : 'No'}</p>
            <p><strong>2FA Enabled:</strong> {profile.two_factor_enabled ? 'Yes' : 'No'}</p>
            <p><strong>Member Since:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}