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
const createMockClient = (): SupabaseClient<Database> => ({
  auth: {
    signUp: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } }),
    signOut: () => Promise.resolve({ error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
  },
  from: () => {
    const devError = { message: 'Development mode: Configure Supabase credentials' }

    const createSelectBuilder = () => {
      const builder: any = {
        eq: () => builder,
        single: () => Promise.resolve({ data: null, error: devError }),
        order: () => Promise.resolve({ data: [], error: null }),
        limit: () => Promise.resolve({ data: [], error: null }),
        abortSignal: () => builder,
      }
      return builder
    }

    const createMutationBuilder = () => {
      const selectBuilder = {
        single: () => Promise.resolve({ data: null, error: devError }),
        abortSignal: () => selectBuilder,
      }

      const builder: any = {
        eq: () => builder,
        select: () => selectBuilder,
        abortSignal: () => builder,
      }
      return builder
    }

    const createInsertBuilder = () => {
      const selectBuilder: any = {
        single: () => Promise.resolve({ data: null, error: devError }),
        abortSignal: () => selectBuilder,
      }

      const builder: any = {
        select: () => selectBuilder,
        abortSignal: () => builder,
      }

      return builder
    }

    return {
      select: () => createSelectBuilder(),
      update: () => createMutationBuilder(),
      insert: () => createInsertBuilder(),
    }
  },
  rpc: () => Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' } }),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {}
  })
}) as unknown as SupabaseClient<Database>

// Debug logging
console.log('Supabase config:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey && supabaseAnonKey !== 'placeholder-anon-key',
  isProduction: process.env.NODE_ENV === 'production',
  isProductionWithoutConfig
})

// Create singleton instances to avoid multiple GoTrueClient instances
let _supabase: SupabaseClient<Database> | null = null

function getSupabaseClient() {
  if (_supabase) return _supabase
  
  _supabase = (supabaseUrl === 'https://placeholder.supabase.co' || isProductionWithoutConfig)
    ? createMockClient()
    : createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      })
  
  return _supabase
}

export const supabase: SupabaseClient<Database> = getSupabaseClient()

// Admin client should only be used server-side, not in frontend
export const supabaseAdmin: SupabaseClient<Database> | null = typeof window === 'undefined' 
  ? (supabaseUrl === 'https://placeholder.supabase.co'
      ? createMockClient()
      : createClient<Database>(
          supabaseUrl,
          process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        ))
  : null

// Helper function to handle database errors
export function handleDatabaseError(error: unknown): string {
  // In development mode with placeholder credentials, provide helpful message
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    return 'Development mode: Please configure Supabase credentials in .env.local'
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
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
