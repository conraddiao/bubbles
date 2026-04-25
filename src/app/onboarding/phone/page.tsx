'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { usePhoneAuth } from '@/hooks/use-phone-auth'
import { useAuth } from '@/hooks/use-auth'
import { phoneVerificationSchema, type PhoneVerificationFormData } from '@/lib/validations'

export default function OnboardingPhonePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { sendOtp, isLoading } = usePhoneAuth()

  const form = useForm<PhoneVerificationFormData>({
    resolver: zodResolver(phoneVerificationSchema),
    defaultValues: { phone: '' },
  })

  // Redirect logged-in users to dashboard (or profile if incomplete)
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [loading, user, router])

  const onSubmit = async (data: PhoneVerificationFormData) => {
    const { error } = await sendOtp(data.phone)
    if (!error) {
      router.push(`/onboarding/verify?phone=${encodeURIComponent(data.phone)}`)
    }
  }

  if (loading || user) return null

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Welcome to Bubbles
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Enter your phone number to sign up or log in
          </p>
        </header>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  className={form.formState.errors.phone ? '[&_input]:border-destructive' : ''}
                />
              )}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
            , and consent to receive text messages from Bubbles &mdash; including verification
            codes and, if you opt in from your profile, MMS contact cards from groups you join.
            Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for
            help.
          </p>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with phone
          </Button>
        </form>
      </main>
    </div>
  )
}
