'use client'

import { createContext, useContext, useEffect, useState, createElement, type ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import { toast } from 'sonner'
import { fetchUserProfile, updateUserProfile, retryOperation } from '@/lib/auth-service'


interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
}

interface AuthActions {
  signUp: (email: string, password: string, firstName: string, lastName: string, phone?: string) => Promise<{ error?: AuthError }>
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>) => Promise<{ error?: string }>
  refreshProfile: () => Promise<void>
}

type AuthContextValue = AuthState & AuthActions

const AuthContext = createContext<AuthContextValue | null>(null)

function useAuthState(): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })

  const fetchProfileWithTimeout = async (userId: string, timeoutMs: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<Profile | null>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Profile fetch timed out'))
      }, timeoutMs)
    })

    try {
      return await Promise.race([fetchUserProfile(userId), timeoutPromise])
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  useEffect(() => {
    let mounted = true
    const loadingTimeoutMs = process.env.NODE_ENV === 'production' ? null : 7000
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null
    
    // Get initial session with improved error handling
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          if (mounted) {
            setState(prev => ({ ...prev, loading: false }))
          }
          return
        }
        
        if (session?.user && mounted) {
          console.log('Session found, fetching profile...')
          try {
            const start = performance.now()
            const profile = await retryOperation(
              () => fetchProfileWithTimeout(session.user.id, 6000),
              2, // Only 2 retries for initial load
              1000
            )
            console.log(`Profile fetch duration (initial): ${Math.round(performance.now() - start)}ms`)
            
            if (mounted) {
              setState({
                user: session.user,
                profile,
                session,
                loading: false,
              })
            }
          } catch (profileError) {
            console.error('Failed to fetch profile after retries:', profileError)
            if (mounted) {
              setState({
                user: session.user,
                profile: null,
                session,
                loading: false,
              })
              toast.error('Failed to load profile. Please refresh the page.')
            }
          }
        } else if (mounted) {
          setState(prev => ({ ...prev, loading: false }))
        }
        if (loadingTimeout) clearTimeout(loadingTimeout)
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }))
        }
        if (loadingTimeout) clearTimeout(loadingTimeout)
      }
    }

    getInitialSession()

    // Failsafe timeout in dev only to avoid stale spinners
    if (loadingTimeoutMs) {
      loadingTimeout = setTimeout(() => {
        if (mounted) {
          console.log('Auth loading timeout - forcing loading to false')
          setState(prev => ({ ...prev, loading: false }))
        }
      }, loadingTimeoutMs)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return
        
        if (loadingTimeout) clearTimeout(loadingTimeout)
        console.log('Auth state change:', event, !!session)
        
        if (session?.user) {
          // Always fetch fresh profile on auth state change
          try {
            const start = performance.now()
            const profile = await fetchProfileWithTimeout(session.user.id, 6000)
            console.log(`Profile fetch duration (auth change): ${Math.round(performance.now() - start)}ms`)
            
            if (mounted) {
              setState({
                user: session.user,
                profile,
                session,
                loading: false,
              })
            }
          } catch (error) {
            console.error('Profile fetch failed on auth change:', error)
            if (mounted) {
              setState({
                user: session.user,
                profile: null,
                session,
                loading: false,
              })
            }
          }
        } else if (mounted) {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (loadingTimeout) clearTimeout(loadingTimeout)
    }
  }, [])

  // Remove the old fetchProfile function - now using the service

  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string,
    phone?: string
  ) => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
          }
        }
      })

      clearTimeout(timeoutId)

      if (error) {
        toast.error(error.message)
        return { error }
      }

      if (data.user && !data.session) {
        toast.success('Please check your email to verify your account')
      } else if (data.session) {
        toast.success('Account created successfully!')
      }

      console.log('Signup result:', { user: data.user, session: data.session })

      return { error: undefined }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const message = 'Sign up request timed out. Please try again.'
        toast.error(message)
        return { error: { message } as AuthError }
      }
      
      const message = 'An unexpected error occurred during sign up'
      toast.error(message)
      return { error: { message } as AuthError }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return { error }
      }

      toast.success('Successfully signed in')
      return { error: undefined }
    } catch (error) {
      const message = 'An unexpected error occurred during sign in'
      toast.error(message)
      return { error: { message } as AuthError }
    }
  }

  const signOut = async () => {
    try {
      // Clear state immediately to prevent profile fetches during signout
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
      })
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Successfully signed out')
      }
    } catch (error) {
      toast.error('An unexpected error occurred during sign out')
    }
  }

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>) => {
    if (!state.user) {
      return { error: 'No user logged in' }
    }

    try {
      const updatedProfile = await updateUserProfile(
        state.user.id,
        updates,
        state.user.email || undefined
      )
      
      if (updatedProfile) {
        setState(prev => ({ ...prev, profile: updatedProfile }))
        toast.success('Profile updated successfully')
        return { error: undefined }
      } else {
        toast.error('Failed to update profile')
        return { error: 'Update failed' }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred while updating profile'
      toast.error(message)
      return { error: message }
    }
  }

  const refreshProfile = async () => {
    if (!state.user) return

    try {
      const profile = await fetchUserProfile(state.user.id)
      setState(prev => ({ ...prev, profile }))
    } catch (error) {
      console.error('Failed to refresh profile:', error)
    }
  }

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState()
  return createElement(AuthContext.Provider, { value: auth }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
