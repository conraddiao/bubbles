'use client'

import { use, useCallback, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ContactGroup } from '@/types'
import { getGroupByToken, joinContactGroup } from '@/lib/database'
import { updateUserProfile } from '@/lib/auth-service'
import { usePhoneAuth } from '@/hooks/use-phone-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { OTPVerifyForm } from '@/components/otp-verify-form'
import { Users, ArrowLeft, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { joinFormSchema, type JoinFormData } from '@/lib/validations'

export const dynamic = 'force-dynamic'

interface JoinPageProps {
  params: Promise<{ token: string }>
}

type Step = 'form' | 'otp' | 'password'

export default function GroupJoinPage({ params }: JoinPageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token
  const router = useRouter()
  const { sendOtp } = usePhoneAuth()

  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState<JoinFormData | null>(null)
  const [password, setPassword] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const form = useForm<JoinFormData>({
    resolver: zodResolver(joinFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
    },
  })

  // Fetch group details
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery<ContactGroup | null>({
    queryKey: ['group-by-token', token],
    queryFn: async () => {
      const result = await getGroupByToken(token)
      if (result.error) throw new Error(result.error)
      return result.data
    },
  })

  const completeJoin = useCallback(async (groupPassword?: string) => {
    setIsJoining(true)
    try {
      // Get the newly authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication failed')

      // Create/update profile with form data
      await updateUserProfile(
        user.id,
        {
          first_name: formData!.first_name,
          last_name: formData!.last_name,
          phone: formData!.phone,
        },
        formData!.email
      )

      // Join the group
      const result = await joinContactGroup(token, false, groupPassword)
      if (result.error) throw new Error(result.error)

      toast.success('Successfully joined the group!')
      router.push(`/groups/${token}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join group'
      toast.error(message)
      setIsJoining(false)
    }
  }, [formData, token, router])

  const handleFormSubmit = form.handleSubmit(async (values) => {
    setFormData(values)
    const { error } = await sendOtp(values.phone)
    if (!error) {
      setStep('otp')
    }
  })

  const handleOtpVerified = useCallback(async () => {
    if (group?.access_type === 'password') {
      setStep('password')
    } else {
      await completeJoin()
    }
  }, [group?.access_type, completeJoin])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('A group password is required to join this group.')
      return
    }
    await completeJoin(password)
  }

  // Loading state
  if (groupLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Error states
  if (groupError || !group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Group Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              The group link is invalid or the group no longer exists.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (group.is_closed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Group Closed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              This group is no longer accepting new members.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (group.archived_at) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Group Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              This group is no longer available.
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // OTP step
  if (step === 'otp' && formData) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
          <OTPVerifyForm
            phone={formData.phone}
            onVerified={handleOtpVerified}
            onChangeNumber={() => setStep('form')}
          />
        </main>
      </div>
    )
  }

  // Password step
  if (step === 'password') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Group Password
            </CardTitle>
            <CardDescription>
              This group requires a password to join.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="group_password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="group_password"
                  type="password"
                  placeholder="Enter the group password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isJoining}
              >
                {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isJoining ? 'Joining...' : 'Join Group'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Form step (default)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join {group.name}
          </CardTitle>
          <CardDescription>
            {group.description || 'Share your contact information with other group members.'}
          </CardDescription>
          {group.owner && (
            <p className="text-sm text-muted-foreground">
              Organized by {group.owner.first_name} {group.owner.last_name}
            </p>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  First Name *
                </label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Enter your first name"
                  {...form.register('first_name')}
                />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Last Name *
                </label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Enter your last name"
                  {...form.register('last_name')}
                />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-destructive">{form.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number *
              </label>
              <Controller
                name="phone"
                control={form.control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    id="phone"
                    className={form.formState.errors.phone ? '[&_input]:border-red-500' : ''}
                  />
                )}
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Sending code...' : 'Join Group'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
