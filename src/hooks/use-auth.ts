import { useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import { toast } from 'sonner'


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

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
          })
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        setState(prev => ({ ...prev, loading: false }))
      }
    }

    getInitialSession()

    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Auth loading timeout - forcing loading to false')
      setState(prev => ({ ...prev, loading: false }))
    }, 3000)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        clearTimeout(timeout) // Clear timeout if auth state changes
        
        if (session?.user) {
          // Only fetch profile if we don't already have one for this user
          const needsProfile = !state.profile || state.profile.id !== session.user.id
          const profile = needsProfile ? await fetchProfile(session.user.id) : state.profile
          
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
          })
        } else {
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
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('Fetching profile for user:', userId)
      

      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('Profile fetch timeout - aborting request')
        controller.abort()
      }, 10000) // 10 second timeout
      
      // Create a promise that will race with the timeout
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Profile fetch timeout'))
        }, 10000)
      })
      
      console.log('Starting profile query...')
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any
      
      clearTimeout(timeoutId)
      console.log('Profile query completed:', { data: !!data, error: error?.code })

      if (error) {
        console.error('Profile fetch error:', error.code, error.message)
        
        // If profile doesn't exist, create it synchronously
        if (error.code === 'PGRST116') {
          console.log('Profile not found - creating profile...')
          
          const { data: user } = await supabase.auth.getUser()
          if (user.user) {
            try {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  email: user.user.email || '',
                  first_name: user.user.user_metadata?.first_name || '',
                  last_name: user.user.user_metadata?.last_name || '',
                  phone: user.user.user_metadata?.phone || null,
                  phone_verified: false,
                  two_factor_enabled: false,
                  sms_notifications_enabled: true
                })
                .select()
                .single()

              if (createError) {
                console.error('Profile creation error:', createError)
                return null
              }
              
              console.log('Profile created successfully:', newProfile)
              return newProfile
            } catch (createError) {
              console.error('Failed to create profile:', createError)
            }
          }
        }
        
        return null
      }

      console.log('Successfully fetched profile:', data)
      return data
    } catch (error: any) {
      if (error.message === 'Profile fetch timeout') {
        console.error('Profile fetch timed out after 10 seconds')
        toast.error('Connection timeout. Please check your internet connection.')
      } else {
        console.error('Profile fetch failed:', error)
      }
      return null
    }
  }

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
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
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
      const { error } = await supabase
        .from('profiles')
        .update(updates as unknown)
        .eq('id', state.user.id)

      if (error) {
        toast.error('Failed to update profile')
        return { error: error.message }
      }

      // Refresh profile data
      await refreshProfile()
      toast.success('Profile updated successfully')
      return { error: undefined }
    } catch (error) {
      const message = 'An unexpected error occurred while updating profile'
      toast.error(message)
      return { error: message }
    }
  }

  const refreshProfile = async () => {
    if (!state.user) return

    const profile = await fetchProfile(state.user.id)
    setState(prev => ({ ...prev, profile }))
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