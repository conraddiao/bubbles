'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { AvatarCropDialog } from '@/components/auth/avatar-crop-dialog'
import { useAuth } from '@/hooks/use-auth'
import { onboardingProfileSchema, type OnboardingProfileFormData } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function OnboardingProfilePage() {
  const router = useRouter()
  const { user, profile, loading, updateProfile, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [pendingCropSrc, setPendingCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<OnboardingProfileFormData>({
    resolver: zodResolver(onboardingProfileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      avatar_url: '',
    },
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/onboarding/phone')
    }
  }, [loading, user, router])

  // Pre-fill from profile / auth user
  useEffect(() => {
    if (user) {
      form.reset({
        first_name: profile?.first_name || user.user_metadata?.first_name || '',
        last_name: profile?.last_name || user.user_metadata?.last_name || '',
        email: profile?.email || user.email || '',
        phone: profile?.phone || user.phone || '',
        avatar_url: profile?.avatar_url || '',
      })
      setPhotoPreview(profile?.avatar_url || null)
    }
  }, [form, profile, user])

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (pendingCropSrc) URL.revokeObjectURL(pendingCropSrc)
    }
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
    if (pendingCropSrc) {
      URL.revokeObjectURL(pendingCropSrc)
      setPendingCropSrc(null)
    }
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
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)
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
    if (pendingCropSrc) {
      URL.revokeObjectURL(pendingCropSrc)
      setPendingCropSrc(null)
    }
  }

  const onSubmit = async (values: OnboardingProfileFormData) => {
    setSaving(true)
    try {
      const trimmed = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        avatar_url: values.avatar_url?.trim() || undefined,
      }

      // Update auth email if provided and different
      if (trimmed.email && trimmed.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: trimmed.email,
        })
        if (emailError) {
          toast.error(emailError.message)
          setSaving(false)
          return
        }
      }

      const { error: updateError } = await updateProfile({
        first_name: trimmed.first_name,
        last_name: trimmed.last_name,
        phone: trimmed.phone,
        avatar_url: trimmed.avatar_url ?? null,
        sms_notifications_enabled: true,
      })

      if (updateError) {
        throw new Error(updateError)
      }

      // Also update email on the profile row (updateProfile omits email by design)
      if (trimmed.email) {
        const { error: emailDbError } = await (supabase as any)
          .from('profiles')
          .update({ email: trimmed.email })
          .eq('id', user!.id)
        if (emailDbError) {
          console.error('Failed to update profile email:', emailDbError)
        }
      }

      await refreshProfile()
      toast.success('Profile saved')
      router.push('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save profile'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            Complete your profile
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Set up your contact card so others can find you
          </p>
        </header>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar picker */}
          <div className="flex justify-center pb-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                aria-label={photoPreview ? 'Change photo' : 'Add photo'}
                className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-border bg-secondary hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:opacity-60"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Contact photo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <UserRound className="h-14 w-14 text-muted-foreground" />
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
                  className="absolute top-0 right-0 h-8 w-8 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
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

          {/* Phone (disabled) */}
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
                  disabled
                />
              )}
            />
          </div>

          {/* First name / Last name */}
          <div className="grid gap-4 grid-cols-2">
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

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              placeholder="jamie@example.com"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Floating Save FAB */}
          <div className="fixed bottom-6 inset-x-0 px-4 z-40 pointer-events-none flex justify-center">
            <Button
              type="submit"
              disabled={saving || uploadingPhoto}
              className="pointer-events-auto h-14 w-full max-w-lg gap-2 text-base shadow-xl"
            >
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              Save
            </Button>
          </div>
        </form>

        {/* Spacer so content isn't hidden behind floating button */}
        <div className="h-24" />
      </main>
    </div>
  )
}
