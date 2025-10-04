'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle, Users, Mail, Phone, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  getGroupByToken, 
  joinContactGroup, 
  joinContactGroupAnonymous,
  getUserProfile 
} from '@/lib/database'
import { useAuth } from '@/hooks/use-auth'
import { contactFormSchema, type ContactFormData } from '@/lib/validations'
import { toast } from 'sonner'

interface ContactFormProps {
  shareToken: string
  onSuccess?: () => void
}

export function ContactForm({ shareToken, onSuccess }: ContactFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { user, loading: authLoading } = useAuth()

  // Get group information
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group-by-token', shareToken],
    queryFn: async () => {
      const result = await getGroupByToken(shareToken)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!shareToken,
  })

  // Get user profile if authenticated
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const result = await getUserProfile()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    enabled: !!user,
    retry: false,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onChange',
    defaultValues: {
      notifications_enabled: false,
    },
  })

  // Pre-fill form with user data if authenticated
  useEffect(() => {
    if (profile && user) {
      setValue('full_name', (profile as any)?.full_name || '')
      setValue('email', (profile as any)?.email || user.email || '')
      setValue('phone', (profile as any)?.phone || '')
      setValue('notifications_enabled', (profile as any)?.sms_notifications_enabled || false)
    }
  }, [profile, user, setValue])

  const joinGroupMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (user) {
        // Authenticated user
        const result = await joinContactGroup(shareToken, data.notifications_enabled)
        if (result.error) throw new Error(result.error)
        return result.data
      } else {
        // Anonymous user
        const result = await joinContactGroupAnonymous(
          shareToken,
          data.full_name,
          data.email,
          data.phone,
          data.notifications_enabled
        )
        if (result.error) throw new Error(result.error)
        return result.data
      }
    },
    onSuccess: () => {
      setIsSubmitted(true)
      toast.success('Successfully joined the group!')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to join group')
    },
  })

  const onSubmit = (data: ContactFormData) => {
    joinGroupMutation.mutate(data)
  }

  if (authLoading || groupLoading) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (groupError || !group) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-destructive mb-4">
              <Users className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Group Not Found</h3>
            </div>
            <p className="text-muted-foreground">
              This group link is invalid or the group may have been closed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if ((group as any)?.is_closed) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {(group as any)?.name}
            </CardTitle>
            <Badge variant="secondary">Closed</Badge>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              This group is no longer accepting new members.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Welcome to {(group as any)?.name}!</h3>
            <p className="text-muted-foreground mb-4">
              You&apos;ve successfully joined the group. You&apos;ll be able to access other members&apos; 
              contact information and they&apos;ll be able to see yours.
            </p>
            {watch('notifications_enabled') && (
              <p className="text-sm text-muted-foreground">
                You&apos;ll receive SMS notifications about group updates.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {(group as any)?.name}
          </CardTitle>
          <CardDescription>
            {(group as any)?.description || 'Join this group to share contact information with other members.'}
          </CardDescription>
          {(group as any)?.owner && (
            <p className="text-sm text-muted-foreground">
              Hosted by {(group as any).owner.full_name}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Full Name *
              </label>
              <Input
                id="full_name"
                placeholder="Enter your full name"
                {...register('full_name')}
                aria-invalid={!!errors.full_name}
                disabled={!!user && !!(profile as any)?.full_name}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...register('email')}
                aria-invalid={!!errors.email}
                disabled={!!user}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number (Optional)
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                {...register('phone')}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="notifications_enabled"
                {...register('notifications_enabled')}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="notifications_enabled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Enable SMS notifications
                </label>
                <p className="text-xs text-muted-foreground">
                  Get notified when new members join or when the group is closed.
                  Requires a valid phone number.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={!isValid || joinGroupMutation.isPending}
                className="w-full"
              >
                {joinGroupMutation.isPending ? 'Joining...' : 'Join Group'}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2">
              By joining, you agree to share your contact information with other group members.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}