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

type TypedSupabaseClient = SupabaseClient<Database>

declare global {
  var __supabaseClient: TypedSupabaseClient | undefined
  var __supabaseAdminClient: TypedSupabaseClient | undefined
}

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseClient?: TypedSupabaseClient
  __supabaseAdminClient?: TypedSupabaseClient
}

type MockResponse<T = null> = Promise<{ data: T; error: { message: string } | null; count?: number }>

type MockFilterBuilder = {
  eq: (...args: unknown[]) => MockFilterBuilder
  single: () => MockResponse
  order: (...args: unknown[]) => Promise<{ data: unknown[]; error: null }>
  count?: number
}

type MockSupabaseClient = {
  _isMock: true
  auth: {
    signUp: () => MockResponse
    signInWithPassword: () => MockResponse
    signInWithOAuth: () => MockResponse
    signOut: () => Promise<{ error: null }>
    getSession: () => Promise<{ data: { session: null }; error: null }>
    onAuthStateChange: () => { data: { subscription: { unsubscribe: () => void } } }
    getUser: () => Promise<{ data: { user: null }; error: null }>
  }
  from: (...args: unknown[]) => {
    select: (...args: unknown[]) => MockFilterBuilder
    update: (...args: unknown[]) => {
      eq: (...args: unknown[]) => {
        select: (...args: unknown[]) => {
          single: () => MockResponse
        }
      }
    }
    insert: (...args: unknown[]) => {
      select: (...args: unknown[]) => {
        single: () => MockResponse
      }
    }
  }
  rpc: (...args: unknown[]) => MockResponse
  channel: (name: string) => {
    on: (...args: unknown[]) => { subscribe: () => void }
    subscribe: () => void
  }
}

// Create a mock client for development when credentials are not available
const createMockClient = (): MockSupabaseClient => {
  const mockResponse = (): MockResponse =>
    Promise.resolve({ data: null, error: { message: 'Development mode: Configure Supabase credentials' }, count: 0 })
  const mockSubscription = { unsubscribe: () => {} }

  const createFilterBuilder = (): MockFilterBuilder => {
    const builder: MockFilterBuilder = {
      eq: () => builder,
      single: mockResponse,
      order: () => Promise.resolve({ data: [], error: null }),
      count: 0
    }
    return builder
  }

  const baseClient: MockSupabaseClient = {
    _isMock: true,
    auth: {
      signUp: mockResponse,
      signInWithPassword: mockResponse,
      signInWithOAuth: mockResponse,
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: mockSubscription } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null })
    },
    from: () => ({
      select: () => createFilterBuilder(),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: mockResponse
          })
        })
      }),
      insert: () => ({
        select: () => ({
          single: mockResponse
        })
      })
    }),
    rpc: mockResponse,
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {}
    })
  }

  return new Proxy<MockSupabaseClient>(baseClient, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof typeof target]
      }
      console.warn(`Supabase mock: Method '${String(prop)}' not implemented`)
      return () => mockResponse()
    }
  })
}

const createMockSupabaseClient = (): TypedSupabaseClient =>
  createMockClient() as unknown as TypedSupabaseClient

const shouldUseMockClient = supabaseUrl === 'https://placeholder.supabase.co' || isProductionWithoutConfig

// Debug logging
console.log('Supabase config:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey && supabaseAnonKey !== 'placeholder-anon-key',
  isProduction: process.env.NODE_ENV === 'production',
  isProductionWithoutConfig
})

// Promise-queue-based auth lock to prevent Web Locks API contention.
// Supabase's default behavior uses navigator.locks with steal semantics,
// which causes "lock was released because another request stole it" errors
// when getInitialSession() and onAuthStateChange() fire concurrently.
const lockQueues = new Map<string, Promise<void>>()

function customAuthLock<T>(name: string, acquireTimeout: number, fn: () => Promise<T>): Promise<T> {
  const existing = lockQueues.get(name) ?? Promise.resolve()

  let releaseLock!: () => void
  const hold = new Promise<void>((res) => { releaseLock = res })
  lockQueues.set(name, existing.then(() => hold))

  // Clean up resolved entries to prevent unbounded map growth
  hold.then(() => {
    if (lockQueues.get(name) === hold) lockQueues.delete(name)
  })

  const acquire = acquireTimeout >= 0
    ? Promise.race([
        existing,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error(`Auth lock timed out: ${name}`)), acquireTimeout)
        ),
      ])
    : existing

  return acquire
    .then(() => {
      // Also apply acquireTimeout to fn() execution to prevent indefinite lock hold
      if (acquireTimeout < 0) return fn()
      return Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Auth operation timed out: ${name}`)), acquireTimeout * 4)
        ),
      ])
    })
    .finally(() => releaseLock())
}

const getSupabaseClient = (): TypedSupabaseClient => {
  if (!globalForSupabase.__supabaseClient) {
    globalForSupabase.__supabaseClient = shouldUseMockClient
      ? createMockSupabaseClient()
      : createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: 'shared-contact-groups-auth',
            lock: customAuthLock,
          }
        })
  }

  return globalForSupabase.__supabaseClient
}

export const supabase = getSupabaseClient()

// For server-side operations that require elevated permissions
const getSupabaseAdminClient = (): TypedSupabaseClient => {
  if (typeof window !== 'undefined') {
    return createMockSupabaseClient()
  }

  if (!globalForSupabase.__supabaseAdminClient) {
    if (shouldUseMockClient) {
      globalForSupabase.__supabaseAdminClient = createMockSupabaseClient()
    } else {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client on server.')
      }
      globalForSupabase.__supabaseAdminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    }
  }

  return globalForSupabase.__supabaseAdminClient
}

const supabaseAdminProxyHandler: ProxyHandler<TypedSupabaseClient> = {
  get(_target, prop, receiver) {
    const client = getSupabaseAdminClient()
    const value = client[prop as keyof TypedSupabaseClient]

    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }

    return Reflect.get(client as unknown as object, prop, receiver)
  }
}

export const supabaseAdmin: TypedSupabaseClient = new Proxy(
  {} as TypedSupabaseClient,
  supabaseAdminProxyHandler
)

const hasMessage = (error: unknown): error is { message: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

// Helper function to handle database errors
export function handleDatabaseError(error: unknown): string {
  // In development mode with placeholder credentials, provide helpful message
  if (supabaseUrl === 'https://placeholder.supabase.co') {
    return 'Development mode: Please configure Supabase credentials in .env.local'
  }

  if (hasMessage(error)) {
    const message = error.message

    // Handle custom function errors
    if (message.includes('User profile not found')) {
      return 'Please complete your profile before creating or joining groups.'
    }
    if (message.includes('already a member')) {
      return 'You are already a member of this group.'
    }
    if (message.includes('Group is closed')) {
      return 'This group is no longer accepting new members.'
    }
    if (message.includes('Invalid group link')) {
      return 'The group link is invalid or the group no longer exists.'
    }
    if (message.includes('email address is already registered')) {
      return 'This email address is already registered in this group.'
    }
    if (message.includes('phone number is already registered')) {
      return 'This phone number is already registered in this group.'
    }
    if (message.includes('phone number is already in use by another member')) {
      return 'This phone number is already in use by another member in one of your groups.'
    }
    if (message.includes('do not have permission')) {
      return 'You do not have permission to perform this action.'
    }
    
    return message
  }
  
  return 'An unexpected error occurred. Please try again.'
}
