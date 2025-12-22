'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Image, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { contactCardSchema, type ContactCardFormData } from '@/lib/validations'
import { useAuth } from '@/hooks/use-auth'
import { updateProfileAcrossGroups } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import { toast } from 'sonner'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const passwordSchema = z
  .object({
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: 'Passwords must match',
    path: ['confirm_password'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth()
  const [savingContact, setSavingContact] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const contactForm = useForm<ContactCardFormData>({
    resolver: zodResolver(contactCardSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      avatar_url: profile?.avatar_url || '',
      sms_notifications_enabled: profile?.sms_notifications_enabled ?? true,
    },
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [loading, router, user])

  useEffect(() => {
    if (profile) {
      contactForm.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
        sms_notifications_enabled: profile.sms_notifications_enabled ?? true,
      })
    }
  }, [contactForm, profile])

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const handleContactSubmit = async (values: ContactCardFormData) => {
    setSavingContact(true)
    try {
      const trimmedValues: ContactCardFormData = {
        ...values,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone?.trim() || undefined,
        avatar_url: values.avatar_url?.trim() || undefined,
      }

      const { error: updateError } = await updateProfile({
        first_name: trimmedValues.first_name,
        last_name: trimmedValues.last_name,
        phone: trimmedValues.phone,
        avatar_url: trimmedValues.avatar_url ?? null,
        sms_notifications_enabled: trimmedValues.sms_notifications_enabled,
      })

      if (updateError) {
        throw new Error(updateError)
      }

      const { error: propagateError } = await updateProfileAcrossGroups(
        trimmedValues.first_name,
        trimmedValues.last_name,
        trimmedValues.phone,
        trimmedValues.avatar_url ?? null
      )

      if (propagateError) {
        throw new Error(propagateError)
      }

      await refreshProfile()
      toast.success('Your contact card has been updated')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update contact card'
      toast.error(message)
    } finally {
      setSavingContact(false)
    }
  }

  const handlePasswordSubmit = async (values: PasswordFormData) => {
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.new_password,
      })

      if (error) {
        throw error
      }

      toast.success('Password updated successfully')
      passwordForm.reset()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to update password'
      toast.error(message)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-indigo-100 to-indigo-200 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Account</p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">User settings</h1>
          <p className="text-slate-700">
            Update your password and the contact details that power the vCard downloads shared
            with your groups.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-indigo-600" />
                Contact card
              </CardTitle>
              <CardDescription>
                These details appear in your shared contact card when members export the group
                vCard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={contactForm.handleSubmit(handleContactSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="first_name" className="text-sm font-medium text-slate-900">
                      First name
                    </label>
                    <Input
                      id="first_name"
                      {...contactForm.register('first_name')}
                      placeholder="Jamie"
                    />
                    {contactForm.formState.errors.first_name && (
                      <p className="text-sm text-red-500">
                        {contactForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="last_name" className="text-sm font-medium text-slate-900">
                      Last name
                    </label>
                    <Input
                      id="last_name"
                      {...contactForm.register('last_name')}
                      placeholder="Rivera"
                    />
                    {contactForm.formState.errors.last_name && (
                      <p className="text-sm text-red-500">
                        {contactForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-slate-900">
                      Phone number
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      {...contactForm.register('phone')}
                      placeholder="+1 (555) 555-0101"
                    />
                    {contactForm.formState.errors.phone && (
                      <p className="text-sm text-red-500">
                        {contactForm.formState.errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="avatar_url"
                      className="flex items-center gap-2 text-sm font-medium text-slate-900"
                    >
                      <Image className="h-4 w-4 text-slate-600" />
                      Contact photo URL
                    </label>
                    <Input
                      id="avatar_url"
                      type="url"
                      {...contactForm.register('avatar_url')}
                      placeholder="https://cdn.example.com/photo.jpg"
                    />
                    <p className="text-xs text-slate-500">
                      iOS and Android contacts can render this image when the vCard is imported.
                    </p>
                    {contactForm.formState.errors.avatar_url && (
                      <p className="text-sm text-red-500">
                        {contactForm.formState.errors.avatar_url.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">SMS notifications</p>
                    <p className="text-xs text-slate-600">
                      Receive important updates and group changes via text message.
                    </p>
                  </div>
                  <Switch
                    checked={contactForm.watch('sms_notifications_enabled')}
                    onCheckedChange={(checked) =>
                      contactForm.setValue('sms_notifications_enabled', checked, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={savingContact || !contactForm.formState.isDirty}
                    className="inline-flex items-center gap-2"
                  >
                    {savingContact && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save contact card
                  </Button>
                  <p className="text-xs text-slate-600">
                    We also update your group memberships so exports use the latest details.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-indigo-600" />
                Password
              </CardTitle>
              <CardDescription>
                Choose a strong password to keep your account secure. You&apos;ll stay signed in on
                this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new_password" className="text-sm font-medium text-slate-900">
                    New password
                  </label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register('new_password')}
                  />
                  {passwordForm.formState.errors.new_password && (
                    <p className="text-sm text-red-500">
                      {passwordForm.formState.errors.new_password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm_password" className="text-sm font-medium text-slate-900">
                    Confirm new password
                  </label>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register('confirm_password')}
                  />
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="text-sm text-red-500">
                      {passwordForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2"
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
