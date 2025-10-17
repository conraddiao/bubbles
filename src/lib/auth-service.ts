import { supabase } from './supabase'
import type { Database, Profile } from '@/types'

// Optimized profile fetching with better error handling
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  try {
    console.log('Fetching profile for user:', userId)
    
    // Use a shorter timeout for better UX
    const timeoutMs = 5000
    const controller = new AbortController()
    
    const timeoutId = setTimeout(() => {
      console.log('Profile fetch timeout - aborting request')
      controller.abort()
    }, timeoutMs)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .single()
    
    clearTimeout(timeoutId)
    
    if (error) {
      console.error('Profile fetch error:', error)
      
      // If profile doesn't exist, create it
      if (error.code === 'PGRST116') {
        console.log('Profile not found - creating new profile')
        return await createUserProfile(userId)
      }
      
      throw error
    }
    
    console.log('Profile fetched successfully')
    return data
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Profile fetch timed out')
      throw new Error('Connection timeout. Please check your internet connection.')
    }
    
    console.error('Profile fetch failed:', error)
    throw error
  }
}

// Create a new user profile
export async function createUserProfile(userId: string): Promise<Profile | null> {
  try {
    console.log('Creating profile for user:', userId)
    
    // Get user data from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unable to get user data for profile creation')
    }
    
    const profileData: Database['public']['Tables']['profiles']['Insert'] = {
      id: userId,
      email: user.email || '',
      first_name: (user.user_metadata?.first_name as string | undefined) || '',
      last_name: (user.user_metadata?.last_name as string | undefined) || '',
      phone: (user.user_metadata?.phone as string | null | undefined) ?? undefined,
      phone_verified: false,
      two_factor_enabled: false,
      sms_notifications_enabled: true
    }
    
    const profileTable = supabase.from('profiles') as any

    const { data, error } = await profileTable
      .insert(profileData)
      .select()
      .single()
    
    if (error) {
      console.error('Profile creation error:', error)
      throw error
    }
    
    console.log('Profile created successfully')
    return data as Profile | null
  } catch (error) {
    console.error('Failed to create profile:', error)
    return null
  }
}

// Update user profile with optimistic updates
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export async function updateUserProfile(
  userId: string, 
  updates: ProfileUpdate
): Promise<Profile | null> {
  try {
    console.log('Updating profile for user:', userId, updates)
    
    const profileTable = supabase.from('profiles') as any

    const { data, error } = await profileTable
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Profile update error:', error)
      throw error
    }
    
    console.log('Profile updated successfully')
    return data as Profile | null
  } catch (error) {
    console.error('Failed to update profile:', error)
    throw error
  }
}

// Check if user has completed their profile
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false
  
  return !!(
    profile.first_name?.trim() &&
    profile.last_name?.trim() &&
    profile.email?.trim()
  )
}

// Get user's authentication status with profile
export async function getAuthenticatedUser(): Promise<{
  user: unknown | null
  profile: Profile | null
  isAuthenticated: boolean
  profileComplete: boolean
}> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return {
        user: null,
        profile: null,
        isAuthenticated: false,
        profileComplete: false
      }
    }
    
    const profile = await fetchUserProfile(user.id)
    
    return {
      user,
      profile,
      isAuthenticated: true,
      profileComplete: isProfileComplete(profile)
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return {
      user: null,
      profile: null,
      isAuthenticated: false,
      profileComplete: false
    }
  }
}

// Retry mechanism for failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error)
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
  }
  
  throw lastError!
}
