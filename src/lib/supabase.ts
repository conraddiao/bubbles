import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types'

// Use placeholder values for development if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Create a mock client for development when credentials are not available
const createMockClient = () => ({
  auth: {
    signUp: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  },
  from: () => ({
    select: () => ({ 
      eq: () => ({ 
        single: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } }),
        order: () => Promise.resolve({ data: [], error: null })
      })
    }),
    update: () => ({ 
      eq: () => ({ 
        select: () => ({ 
          single: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } })
        })
      })
    }),
    insert: () => ({ 
      select: () => ({ 
        single: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } })
      })
    }),
  }),
  rpc: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } }),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {}
  })
})

export const supabase = supabaseUrl === 'https://placeholder.supabase.co' 
  ? createMockClient() as any
  : createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })

// For server-side operations that require elevated permissions
export const supabaseAdmin = supabaseUrl === 'https://placeholder.supabase.co'
  ? createMockClient() as any
  : createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

// Helper function to handle database errors
export function handleDatabaseError(error: any): string {
  // In development mode with placeholder credentials, provide helpful message
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    return 'Development mode: Please configure Supabase credentials in .env.local'
  }

  if (error?.message) {
    // Handle custom function errors
    if (error.message.includes('User profile not found')) {
      return 'Please complete your profile before creating or joining groups.'
    }
    if (error.message.includes('already a member')) {
      return 'You are already a member of this group.'
    }
    if (error.message.includes('Group is closed')) {
      return 'This group is no longer accepting new members.'
    }
    if (error.message.includes('Invalid group link')) {
      return 'The group link is invalid or the group no longer exists.'
    }
    if (error.message.includes('email address is already registered')) {
      return 'This email address is already registered in this group.'
    }
    if (error.message.includes('do not have permission')) {
      return 'You do not have permission to perform this action.'
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}