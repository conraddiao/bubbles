'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const error = params.get('error')

      // Only honor safe internal paths; anything else falls back to the dashboard.
      const nextParam = params.get('next')
      const destination =
        nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
          ? nextParam
          : '/dashboard'

      if (error) {
        router.replace('/auth?error=auth')
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          router.replace('/auth?error=auth')
        } else {
          router.replace(destination)
        }
        return
      }

      // Implicit flow: tokens are in the hash fragment.
      // detectSessionInUrl: true on the supabase client will process them automatically.
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          if (timeout) clearTimeout(timeout)
          sub.unsubscribe()
          router.replace(destination)
        }
      })
      subscription = sub

      // Check if session was already established before the listener was set up
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (timeout) clearTimeout(timeout)
        sub.unsubscribe()
        router.replace(destination)
        return
      }

      // Fallback: if no session after 5s, redirect to error
      timeout = setTimeout(() => {
        sub.unsubscribe()
        router.replace('/auth?error=auth')
      }, 5000)
    }

    handleCallback()

    return () => {
      if (subscription) subscription.unsubscribe()
      if (timeout) clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
