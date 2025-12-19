'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { useAuth } from '@/hooks/use-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  
  const mode = searchParams.get('mode') as 'signin' | 'signup' || 'signin'
  const redirectTo = searchParams.get('redirect') || '/'

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthForm 
          mode={mode}
          onSuccess={() => router.push(redirectTo)}
          redirectTo={redirectTo}
        />
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
