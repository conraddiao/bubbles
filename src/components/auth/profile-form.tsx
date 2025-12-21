'use client'

import { useEffect, useState } from 'react'
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
  const { user, profile, updateProfile } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      sms_notifications_enabled: profile?.sms_notifications_enabled ?? true,
    },
  })

  useEffect(() => {
    const firstName = profile?.first_name || user?.user_metadata?.first_name || ''
    const lastName = profile?.last_name || user?.user_metadata?.last_name || ''
    const phone = profile?.phone || user?.user_metadata?.phone || ''
    const smsEnabled = profile?.sms_notifications_enabled ?? true

    setValue('first_name', firstName, { shouldDirty: false })
    setValue('last_name', lastName, { shouldDirty: false })
    setValue('phone', phone, { shouldDirty: false })
    setValue('sms_notifications_enabled', smsEnabled, { shouldDirty: false })
  }, [profile, user, setValue])

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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Enter your first name"
                  {...register('first_name')}
                  className={errors.first_name ? 'border-red-500' : ''}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Last Name
                </label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Enter your last name"
                  {...register('last_name')}
                  className={errors.last_name ? 'border-red-500' : ''}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name.message}</p>
                )}
              </div>
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
            <p><strong>Email:</strong> {profile?.email || user?.email || 'Unavailable'}</p>
            <p><strong>Phone Verified:</strong> {profile?.phone_verified ? 'Yes' : 'No'}</p>
            <p><strong>2FA Enabled:</strong> {profile?.two_factor_enabled ? 'Yes' : 'No'}</p>
            <p><strong>Member Since:</strong> {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unavailable'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
