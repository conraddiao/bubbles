import { supabase } from './supabase'
import type { Database, Profile } from '@/types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'] & { id: string }

// Optimized profile fetching with better error handling
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  try {
    console.log('Fetching profile for user:', userId)
    
    // Use a shorter timeout for better UX
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
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
    // No abort logic; allow Supabase to resolve normally
    
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
    
    const profileData: ProfileInsert = {
      id: userId,
      email: user.email || '',
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      phone: user.user_metadata?.phone || null,
      phone_verified: false,
      two_factor_enabled: false,
      sms_notifications_enabled: true
    }
    
    const supabaseClient = supabase as any
    const { data, error } = await supabaseClient
      .from('profiles')
      .insert(profileData)
      .select()
      .single()
    
    if (error) {
      console.error('Profile creation error:', error)
      throw error
    }
    
    console.log('Profile created successfully')
    return data
  } catch (error) {
    console.error('Failed to create profile:', error)
    return null
  }
}

// Update user profile with optimistic updates
export async function updateUserProfile(
  userId: string, 
  updates: Partial<Omit<Profile, 'id' | 'email' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  try {
    console.log('Updating profile for user:', userId, updates)
    
    const supabaseClient = supabase as any
    const { data, error } = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('Profile update error:', error)
      throw error
    }
    
    console.log('Profile updated successfully')
    return data
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
