import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types'

// Use placeholder values for development if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Check if we're in a production environment without proper config
const isProductionWithoutConfig = process.env.NODE_ENV === 'production' && supabaseUrl === 'https://placeholder.supabase.co'

if (isProductionWithoutConfig) {
  console.error('CRITICAL: Supabase environment variables not configured in production!')
}

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

const createMockSupabaseClient = () => createMockClient() as unknown as SupabaseClientLike

type SupabaseClientLike = SupabaseClient<Database>

const globalForSupabase = globalThis as typeof globalThis & {
  _supabaseClient?: SupabaseClientLike
  _supabaseAdminClient?: SupabaseClientLike
}

const shouldUseMockClient = supabaseUrl === 'https://placeholder.supabase.co' || isProductionWithoutConfig

// Debug logging
console.log('Supabase config:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey && supabaseAnonKey !== 'placeholder-anon-key',
  isProduction: process.env.NODE_ENV === 'production',
  isProductionWithoutConfig
})

const getSupabaseClient = (): SupabaseClientLike => {
  if (!globalForSupabase._supabaseClient) {
    globalForSupabase._supabaseClient = shouldUseMockClient
      ? createMockSupabaseClient()
      : createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: 'shared-contact-groups-auth'
          }
        })
  }

  return globalForSupabase._supabaseClient
}

export const supabase = getSupabaseClient()

// For server-side operations that require elevated permissions
const getSupabaseAdminClient = (): SupabaseClientLike => {
  if (!globalForSupabase._supabaseAdminClient) {
    globalForSupabase._supabaseAdminClient = shouldUseMockClient
      ? createMockSupabaseClient()
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
  }

  return globalForSupabase._supabaseAdminClient
}

export const supabaseAdmin =
  typeof window === 'undefined'
    ? getSupabaseAdminClient()
    : (globalForSupabase._supabaseAdminClient ??= createMockSupabaseClient())

// Helper function to handle database errors
export function handleDatabaseError(error: unknown): string {
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
