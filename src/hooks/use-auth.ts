import { useEffect, useRef, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types'
import { toast } from 'sonner'
import { fetchUserProfile, updateUserProfile, retryOperation } from '@/lib/auth-service'


interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
}

interface AuthActions {
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string
  ) => Promise<{ error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<void>;
  updateProfile: (
    updates: Partial<
      Omit<Profile, "id" | "email" | "created_at" | "updated_at">
    >
  ) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  });

  const initializationRef = useRef(false);

  useEffect(() => {
    let mounted = true
    
    const fetchAndSetProfile = async (userId: string) => {
      try {
        const profile = await retryOperation(
          () => fetchUserProfile(userId),
          2,
          1000
        )

        if (mounted) {
          setState(prev => ({
            ...prev,
            profile,
          }))
        }
      } catch (profileError) {
        console.error('Failed to fetch profile after retries:', profileError)
        if (mounted) {
          setState(prev => ({
            ...prev,
            profile: null,
          }))
          toast.error('Failed to load profile. Please refresh the page.')
        }
      }
    }

    // Get initial session with improved error handling
    const getInitialSession = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

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
          console.log('Session found via getSession, setting state and loading profile...')
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            loading: false,
          }))

          void fetchAndSetProfile(session.user.id)
        } else if (mounted) {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (mounted) {
          setState(prev => ({ ...prev, loading: false }))
        }
      }
    };

    void getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        if (!mounted) return
        
        console.log('Auth state change:', event, !!session)
        
        if (session?.user) {
          console.log('Auth change received, setting user from event...')
          if (mounted) {
            setState(prev => ({
              ...prev,
              user: session.user,
              session,
              loading: false,
            }))
          }

          void fetchAndSetProfile(session.user.id)
        } else if (mounted) {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
          });
        }
      }
    );

    return () => {
      mounted = false
      subscription.unsubscribe()
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
          },
        },
      });

      clearTimeout(timeoutId);

      if (error) {
        toast.error(error.message);
        return { error };
      }

      if (data.user && !data.session) {
        toast.success("Please check your email to verify your account");
      } else if (data.session) {
        toast.success("Account created successfully!");
      }

      console.log("Signup result:", { user: data.user, session: data.session });

      return { error: undefined };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        const message = "Sign up request timed out. Please try again.";
        toast.error(message);
        return { error: { message } as AuthError };
      }

      const message = "An unexpected error occurred during sign up";
      toast.error(message);
      return { error: { message } as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success("Successfully signed in");
      return { error: undefined };
    } catch (error) {
      const message = "An unexpected error occurred during sign in";
      toast.error(message);
      return { error: { message } as AuthError };
    }
  };

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
        toast.error(error.message);
      } else {
        toast.success("Successfully signed out");
      }
    } catch (error) {
      toast.error("An unexpected error occurred during sign out");
    }
  };

  const updateProfile = async (
    updates: Partial<
      Omit<Profile, "id" | "email" | "created_at" | "updated_at">
    >
  ) => {
    if (!state.user) {
      return { error: "No user logged in" };
    }

    try {
      const updatedProfile = await updateUserProfile(state.user.id, updates)
      
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
  };

  const refreshProfile = async () => {
    if (!state.user) return;

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
  };
}
