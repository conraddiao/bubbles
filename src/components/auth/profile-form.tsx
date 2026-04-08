'use client'

import { useEffect, useRef, useState } from 'react'
import { AvatarCropDialog } from './avatar-crop-dialog'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, UserRound } from 'lucide-react'
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
  onSuccess?: () => void
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, profile, updateProfile, refreshProfile } = useAuth()

  const form = useForm<ContactCardFormData>({
    resolver: zodResolver(contactCardSchema),
    defaultValues: {
      first_name: profile?.first_name || user?.user_metadata?.first_name || user?.user_metadata?.given_name || '',
      last_name: profile?.last_name || user?.user_metadata?.last_name || user?.user_metadata?.family_name || '',
      phone: profile?.phone || '',
      avatar_url: profile?.avatar_url || '',
      sms_notifications_enabled: profile?.sms_notifications_enabled ?? true,
    },
  })

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || user?.user_metadata?.first_name || user?.user_metadata?.given_name || '',
        last_name: profile.last_name || user?.user_metadata?.last_name || user?.user_metadata?.family_name || '',
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
      toast.success('Your contact card has been updated')
      onSuccess?.()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update contact card'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    return () => { if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc) }
  }, [pendingCropSrc])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Photo must be under 20 MB')
      return
    }
    setPendingCropSrc(URL.createObjectURL(file))
    setCropDialogOpen(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropComplete = async (blob: Blob) => {
    setCropDialogOpen(false)
    if (pendingCropSrc) { URL.revokeObjectURL(pendingCropSrc); setPendingCropSrc(null) }
    if (!user) return

    const previewUrl = URL.createObjectURL(blob)
    setPhotoPreview(previewUrl)
    setUploadingPhoto(true)
    try {
      const path = `${user.id}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setPhotoPreview(publicUrl)
      URL.revokeObjectURL(previewUrl)
      form.setValue('avatar_url', publicUrl, { shouldDirty: true, shouldValidate: true })
      toast.success('Photo uploaded')
    } catch (err) {
      setPhotoPreview(form.getValues('avatar_url') || null)
      URL.revokeObjectURL(previewUrl)
      toast.error(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCropCancel = () => {
    setCropDialogOpen(false)
    if (pendingCropSrc) { URL.revokeObjectURL(pendingCropSrc); setPendingCropSrc(null) }
  }

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
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile photo */}
          <div className="flex justify-center pb-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label={photoPreview ? 'Change photo' : 'Add photo'}
                className="relative h-48 w-48 rounded-full overflow-hidden border-2 border-border bg-secondary hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Contact photo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <UserRound className="h-20 w-20 text-muted-foreground" />
                  </span>
                )}
                {uploadingPhoto && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </span>
                )}
              </button>

              {!uploadingPhoto && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Edit photo"
                  className="absolute top-1 right-1 h-9 w-9 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoSelect}
            disabled={uploadingPhoto}
            aria-label="Select contact photo"
          />

          <input type="hidden" {...form.register('avatar_url')} />

          <AvatarCropDialog
            imageSrc={pendingCropSrc}
            open={cropDialogOpen}
            onClose={handleCropCancel}
            onCropComplete={handleCropComplete}
          />

          {form.formState.errors.avatar_url && (
            <p className="text-sm text-destructive">
              {form.formState.errors.avatar_url.message}
            </p>
          )}

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

          {form.formState.isDirty && (
            <div className="fixed bottom-6 inset-x-0 px-4 z-40 pointer-events-none flex justify-center">
              <Button
                type="submit"
                disabled={saving || uploadingPhoto}
                className="pointer-events-auto h-14 w-full max-w-lg gap-2 text-base shadow-xl"
              >
                {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                Save contact card
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
