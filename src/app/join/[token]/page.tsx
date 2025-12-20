'use client'

import { use, useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ContactGroup, Database } from '@/types'
import { getGroupByToken, joinContactGroup, joinContactGroupAnonymous, validateGroupPassword } from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Users, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'
import { toast } from 'sonner'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface JoinPageProps {
  params: Promise<{
    token: string
  }>
}

export default function JoinPage({ params }: JoinPageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token
  type ProfileRow = Database['public']['Tables']['profiles']['Row']

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notifications_enabled: false
  })
  const [hasJoined, setHasJoined] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [password, setPassword] = useState('')
  const [passwordValidated, setPasswordValidated] = useState(false)
  const [isCheckingPassword, setIsCheckingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Check if user is logged in (optional, don't block on this)
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          // Try to get profile, but don't block if it fails
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name,last_name,email,phone,sms_notifications_enabled')
            .eq('id', user.id)
            .single<ProfileRow>()
          
          if (profile) {
            setFormData({
              first_name: profile.first_name || '',
              last_name: profile.last_name || '',
              email: profile.email || user.email || '',
              phone: profile.phone || '',
              notifications_enabled: profile.sms_notifications_enabled || false
            })
          }
        }
      } catch (error) {
        console.log('No user logged in or profile fetch failed:', error)
        // Continue without auth - this is fine for anonymous users
      }
    }
    
    checkUser()
  }, [])

  // Fetch group details
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery<ContactGroup | null>({
    queryKey: ['group-by-token', token],
    queryFn: async () => {
      const result = await getGroupByToken(token)
      if (result.error) throw new Error(result.error)
      return result.data
    },
  })

  const isPasswordProtected = Boolean(
    group?.requires_password ||
      group?.is_password_protected ||
      group?.password_required
  )

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (isPasswordProtected && !passwordValidated) {
        throw new Error('Please enter the group password before joining.')
      }

      if (isPasswordProtected && !user) {
        throw new Error('Please sign in or create an account to join this password-protected group.')
      }

      if (user) {
        // Authenticated user
        const result = await joinContactGroup(token, formData.notifications_enabled)
        if (result.error) throw new Error(result.error)
        return result.data
      } else {
        // Anonymous user
        const result = await joinContactGroupAnonymous(
          token,
          formData.first_name,
          formData.last_name,
          formData.email,
          formData.phone,
          formData.notifications_enabled
        )
        if (result.error) throw new Error(result.error)
        return result.data
      }
    },
    onSuccess: () => {
      setHasJoined(true)
      toast.success('Successfully joined the group!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join group'
      toast.error(errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isPasswordProtected && !passwordValidated) {
      setPasswordError('Enter the group password to continue.')
      toast.error('Enter the group password to continue.')
      return
    }

    if (isPasswordProtected && !user) {
      toast.error('Please sign in or create an account to join this password-protected group.')
      return
    }

    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      toast.error('First name, last name, and email are required')
      return
    }

    joinMutation.mutate()
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    const trimmedPassword = password.trim()
    if (!trimmedPassword) {
      setPasswordError('Password is required')
      return
    }

    setIsCheckingPassword(true)
    const { data, error } = await validateGroupPassword(token, trimmedPassword)
    setIsCheckingPassword(false)

    if (error) {
      setPasswordError(error)
      return
    }

    if (!data) {
      setPasswordError('Incorrect password. Please try again.')
      return
    }

    setPasswordValidated(true)
    toast.success('Password accepted. You can now join this group.')
  }

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (groupError || !group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Group Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Group Closed</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
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

  if (hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Successfully Joined!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              You&apos;ve been added to <strong>{group.name}</strong>. Other members can now see your contact information.
            </p>
            {user ? (
              <Link href="/">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <div className="space-y-2">
                <Link href="/auth?mode=signup">
                  <Button className="w-full">Create Account</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full">Go Home</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
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
            <p className="text-sm text-gray-500">
              Organized by {group.owner.first_name} {group.owner.last_name}
            </p>
          )}
        </CardHeader>
        
        <CardContent>
          {isPasswordProtected && (
            <Alert className="mb-4">
              <AlertTitle>This group is password protected</AlertTitle>
              <AlertDescription>
                Enter the password to unlock the join form. You&apos;ll need an account to continue.
              </AlertDescription>
            </Alert>
          )}

          {isPasswordProtected && !passwordValidated && (
            <form onSubmit={handlePasswordSubmit} className="space-y-3 mb-6">
              <div className="space-y-2">
                <label htmlFor="group_password" className="text-sm font-medium">
                  Group Password
                </label>
                <Input
                  id="group_password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the password provided by the organizer"
                  aria-invalid={!!passwordError}
                />
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isCheckingPassword}>
                {isCheckingPassword ? 'Checking...' : 'Continue'}
              </Button>
            </form>
          )}

          {isPasswordProtected && passwordValidated && !user && (
            <Alert className="mb-6">
              <AlertTitle>Sign in required</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>You need an account to join password-protected groups.</p>
                <div className="flex gap-2">
                  <Link href={`/auth?mode=signin&redirect=/join/${token}`}>
                    <Button variant="secondary">Login</Button>
                  </Link>
                  <Link href={`/auth?mode=signup&redirect=/join/${token}`}>
                    <Button>Create account</Button>
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  First Name *
                </label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Enter your first name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                  disabled={isPasswordProtected && !passwordValidated}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium">
                  Last Name *
                </label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Enter your last name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                  disabled={isPasswordProtected && !passwordValidated}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                disabled={(isPasswordProtected && !passwordValidated) || !!user}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number (Optional)
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={isPasswordProtected && !passwordValidated}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifications"
                checked={formData.notifications_enabled}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, notifications_enabled: !!checked }))
                }
                disabled={isPasswordProtected && !passwordValidated}
              />
              <label htmlFor="notifications" className="text-sm">
                Notify me when members join or leave this group
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                joinMutation.isPending ||
                (isPasswordProtected && (!passwordValidated || !user))
              }
            >
              {joinMutation.isPending ? 'Joining...' : 'Join Group'}
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
