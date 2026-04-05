'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Image, Loader2, Upload, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { contactCardSchema, type ContactCardFormData } from '@/lib/validations'
import { updateProfileAcrossGroups } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ProfileFormProps {
  mode: 'setup' | 'settings'
  onSuccess?: () => void
}

export function ProfileForm({ mode, onSuccess }: ProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, profile, updateProfile, refreshProfile } = useAuth()

  const form = useForm<ContactCardFormData>({
    resolver: zodResolver(contactCardSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      avatar_url: profile?.avatar_url || '',
      sms_notifications_enabled: profile?.sms_notifications_enabled ?? true,
    },
  })

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || user?.user_metadata?.first_name || '',
        last_name: profile.last_name || user?.user_metadata?.last_name || '',
        phone: profile.phone || user?.user_metadata?.phone || '',
        avatar_url: profile.avatar_url || '',
        sms_notifications_enabled: profile.sms_notifications_enabled ?? true,
      })
      setPhotoPreview(profile.avatar_url || null)
    }
  }, [form, profile, user])

  const onSubmit = async (values: ContactCardFormData) => {
    setSaving(true)
    try {
      const trimmed: ContactCardFormData = {
        ...values,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone?.trim() || undefined,
        avatar_url: values.avatar_url?.trim() || undefined,
      }

      const { error: updateError } = await updateProfile({
        first_name: trimmed.first_name,
        last_name: trimmed.last_name,
        phone: trimmed.phone,
        avatar_url: trimmed.avatar_url ?? null,
        sms_notifications_enabled: trimmed.sms_notifications_enabled,
      })

      if (updateError) {
        throw new Error(updateError)
      }

      const { error: propagateError } = await updateProfileAcrossGroups(
        trimmed.first_name,
        trimmed.last_name,
        trimmed.phone,
        trimmed.avatar_url ?? null
      )

      if (propagateError) {
        throw new Error(propagateError)
      }

      await refreshProfile()

      if (mode === 'settings') {
        toast.success('Your contact card has been updated')
      }

      onSuccess?.()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update contact card'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPhotoPreview(objectUrl)
    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setPhotoPreview(publicUrl)
      URL.revokeObjectURL(objectUrl)
      form.setValue('avatar_url', publicUrl, { shouldDirty: true, shouldValidate: true })
      toast.success('Photo uploaded')
    } catch (err) {
      setPhotoPreview(form.getValues('avatar_url') || null)
      URL.revokeObjectURL(objectUrl)
      toast.error(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handlePhotoClear = () => {
    setPhotoPreview(null)
    form.setValue('avatar_url', '', { shouldDirty: true, shouldValidate: true })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isSubmitDisabled = mode === 'settings'
    ? saving || uploadingPhoto || !form.formState.isDirty
    : saving || uploadingPhoto

  const formContent = (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {mode !== 'setup' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="first_name" className="text-sm font-medium">
              First name
            </label>
            <Input
              id="first_name"
              {...form.register('first_name')}
              placeholder="Jamie"
            />
            {form.formState.errors.first_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.first_name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="last_name" className="text-sm font-medium">
              Last name
            </label>
            <Input
              id="last_name"
              {...form.register('last_name')}
              placeholder="Rivera"
            />
            {form.formState.errors.last_name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.last_name.message}
              </p>
            )}
          </div>
        </div>
      )}

      <div className={mode === 'setup' ? undefined : 'grid gap-4 md:grid-cols-2'}>
        {mode !== 'setup' && (
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone number
            </label>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <PhoneInput
                  {...field}
                  id="phone"
                />
              )}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Image className="h-4 w-4 text-muted-foreground" />
            Contact photo
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoSelect}
            disabled={uploadingPhoto}
            aria-label="Select contact photo"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label={photoPreview ? 'Change photo' : 'Add photo'}
              className="relative flex-shrink-0 h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-secondary hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Contact photo preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <UserRound className="h-7 w-7 text-muted-foreground" />
                </span>
              )}
              {uploadingPhoto && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </span>
              )}
            </button>

            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="gap-1.5"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {uploadingPhoto ? 'Uploading…' : photoPreview ? 'Change photo' : 'Select photo'}
              </Button>

              {photoPreview && !uploadingPhoto && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePhotoClear}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove photo
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            iOS and Android contacts render this image when the vCard is imported.
          </p>

          <input type="hidden" {...form.register('avatar_url')} />

          {form.formState.errors.avatar_url && (
            <p className="text-sm text-destructive">
              {form.formState.errors.avatar_url.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">SMS notifications</p>
          <p className="text-xs text-muted-foreground">
            Receive important updates and group changes via text message.
          </p>
        </div>
        <Switch
          checked={form.watch('sms_notifications_enabled')}
          onCheckedChange={(checked) =>
            form.setValue('sms_notifications_enabled', checked, {
              shouldDirty: true,
            })
          }
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'setup' ? 'Complete Profile' : 'Save contact card'}
        </Button>
        {mode === 'settings' && (
          <p className="text-xs text-muted-foreground">
            We also update your group memberships so exports use the latest details.
          </p>
        )}
      </div>
    </form>
  )

  if (mode === 'settings') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            Contact card
          </CardTitle>
          <CardDescription>
            These details appear in your shared contact card when members export the group
            vCard.
          </CardDescription>
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-5 w-5" />
          Profile Settings
        </CardTitle>
        <CardDescription>
          Update your profile information. Changes will be reflected across all your groups.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}

        <div className="mt-6 p-4 bg-secondary rounded-lg">
          <h4 className="text-sm font-medium mb-2">Account Information</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
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
