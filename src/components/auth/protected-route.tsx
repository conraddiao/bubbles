'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface ProtectedRouteProps {
  children: ReactNode
  requireProfile?: boolean
  redirectTo?: string
  fallback?: ReactNode
}

export function ProtectedRoute({ 
  children, 
  requireProfile = true,
  redirectTo = '/auth',
  fallback 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo)
    }
    // Don't redirect for missing profile immediately - let the profile fetch complete
    // The profile setup redirect should be handled elsewhere if truly needed
  }, [user, loading, router, redirectTo])

  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  // Allow access even if profile is missing - let individual pages handle profile requirements
  // This prevents infinite redirects during profile loading

  return <>{children}</>
}

// Higher-order component version for easier use
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}