'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PhoneInput } from '@/components/ui/phone-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { signInSchema, signUpSchema, SignInFormData, SignUpFormData } from '@/lib/validations'

interface AuthFormProps {
  mode?: 'signin' | 'signup'
  onSuccess?: () => void
  redirectTo?: string
}

export function AuthForm({ mode = 'signin', onSuccess, redirectTo }: AuthFormProps) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(mode)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const isSignUp = authMode === 'signup'
  
  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  })

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { sms_notifications_enabled: false },
  })

  const smsOptIn = signUpForm.watch('sms_notifications_enabled')

  const currentForm = isSignUp ? signUpForm : signInForm

  const onSubmit = async (data: SignInFormData | SignUpFormData) => {
    setIsLoading(true)
    
    try {
      let result
      
      if (isSignUp) {
        const signUpData = data as SignUpFormData
        result = await signUp(
          signUpData.email,
          signUpData.password,
          signUpData.first_name,
          signUpData.last_name,
          signUpData.phone,
          signUpData.sms_notifications_enabled
        )
        if (!result.error && result.requiresEmailConfirmation) {
          const encodedEmail = encodeURIComponent(signUpData.email)
          router.push(`/auth/check-email?email=${encodedEmail}`)
          return
        }
      } else {
        const signInData = data as SignInFormData
        result = await signIn(signInData.email, signInData.password)
      }

      if (!result.error) {
        currentForm.reset()
        if (onSuccess) {
          onSuccess()
        } else if (redirectTo) {
          window.location.href = redirectTo
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setAuthMode(prev => prev === 'signin' ? 'signup' : 'signin')
    signInForm.reset()
    signUpForm.reset()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </CardTitle>
        <CardDescription className="text-center">
          {isSignUp 
            ? 'Sign up to create and manage contact groups'
            : 'Sign in to your account to continue'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Button
          type="button"
          variant="outline"
          className="w-full bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-2)] mb-4"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </Button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--surface)] px-2 text-[var(--text-muted)]">or</span>
          </div>
        </div>

        <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-4">
          {isSignUp && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium">
                  First Name
                </label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Enter your first name"
                  {...signUpForm.register('first_name')}
                  className={signUpForm.formState.errors.first_name ? 'border-red-500' : ''}
                />
                {signUpForm.formState.errors.first_name && (
                  <p className="text-sm text-red-500">{signUpForm.formState.errors.first_name.message}</p>
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
                  {...signUpForm.register('last_name')}
                  className={signUpForm.formState.errors.last_name ? 'border-red-500' : ''}
                />
                {signUpForm.formState.errors.last_name && (
                  <p className="text-sm text-red-500">{signUpForm.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...(isSignUp ? signUpForm.register('email') : signInForm.register('email'))}
              className={currentForm.formState.errors.email ? 'border-red-500' : ''}
            />
            {currentForm.formState.errors.email && (
              <p className="text-sm text-red-500">{currentForm.formState.errors.email.message}</p>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </label>
              <Controller
                name="phone"
                control={signUpForm.control}
                render={({ field }) => (
                  <PhoneInput
                    {...field}
                    id="phone"
                    className={signUpForm.formState.errors.phone ? '[&_input]:border-red-500' : ''}
                  />
                )}
              />
              {signUpForm.formState.errors.phone && (
                <p className="text-sm text-red-500">{signUpForm.formState.errors.phone.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Create a password (min 8 characters)' : 'Enter your password'}
                {...(isSignUp ? signUpForm.register('password') : signInForm.register('password'))}
                className={currentForm.formState.errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active-scale"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {currentForm.formState.errors.password && (
              <p className="text-sm text-red-500">{currentForm.formState.errors.password.message}</p>
            )}
          </div>

          {isSignUp && (
            <div className="flex items-start gap-3">
              <Checkbox
                id="sms_notifications_enabled"
                checked={smsOptIn}
                onCheckedChange={(checked) => signUpForm.setValue('sms_notifications_enabled', !!checked)}
                className="mt-0.5"
              />
              <label htmlFor="sms_notifications_enabled" className="cursor-pointer space-y-1">
                <p className="text-sm font-medium leading-none">Send contact cards by MMS when I join a group</p>
                <p className="text-xs text-muted-foreground">
                  Optional. You can change this anytime in your profile.
                </p>
              </label>
            </div>
          )}

          {isSignUp && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
              , and consent to receive text messages from Bubbles &mdash; including verification
              codes and, if enabled above, MMS contact cards from groups you join. Msg frequency
              varies. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            {' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-primary hover:text-[var(--accent-dark)] underline active-scale"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
