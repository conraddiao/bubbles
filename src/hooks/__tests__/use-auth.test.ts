import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../use-auth'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase')

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useAuth', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockProfile = {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    phone: '+1234567890',
    phone_verified: true,
    two_factor_enabled: false,
    sms_notifications_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockSession = {
    user: mockUser,
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock Supabase auth methods
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })
    
    // Mock Supabase database methods
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      update: vi.fn().mockReturnThis(),
    } as any)
  })

  describe('Initial State', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useAuth())
      
      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBe(null)
      expect(result.current.profile).toBe(null)
      expect(result.current.session).toBe(null)
    })

    it('loads user session on mount', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.session).toEqual(mockSession)
    })
  })

  describe('Sign Up', () => {
    it('signs up user with email and password', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
    const signUpResult = await result.current.signUp(
      'test@example.com',
      'password123',
      'Test',
      'User',
      '+1234567890'
    )
      
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User',
            full_name: 'Test User',
            phone: '+1234567890',
          },
        },
      })
      
      expect(signUpResult.error).toBeUndefined()
    })

    it('handles sign up with optional phone number', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
      await result.current.signUp('test@example.com', 'password123', 'Test', 'User')
      
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'Test',
            last_name: 'User',
            full_name: 'Test User',
            phone: null,
          },
        },
      })
    })

    it('handles sign up errors', async () => {
      const error = { message: 'Email already exists' }
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error,
      })
      
      const { result } = renderHook(() => useAuth())
      
      const signUpResult = await result.current.signUp(
        'test@example.com',
        'password123',
        'Test',
        'User'
      )
      
      expect(signUpResult.error).toEqual(error)
    })

    it('shows success message for email verification', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: null }, // No session means email verification needed
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
      await result.current.signUp('test@example.com', 'password123', 'Test', 'User')
      
      const { toast } = require('sonner')
      expect(toast.success).toHaveBeenCalledWith('Please check your email to verify your account')
    })

    it('provides helpful guidance when profiles table is missing', async () => {
      const error = { message: 'Database error saving new user' } as AuthError
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error,
      })

      const { result } = renderHook(() => useAuth())

      const signUpResult = await result.current.signUp(
        'test@example.com',
        'password123',
        'Test',
        'User'
      )

      const { toast } = require('sonner')
      expect(toast.error).toHaveBeenCalledWith(
        'Signup failed because the user profile table is missing. Run your database migrations (e.g., npm run migrate or npm run migrate:simple, or supabase db push) and try again.'
      )
      expect(signUpResult.error?.message).toBe(
        'Signup failed because the user profile table is missing. Run your database migrations (e.g., npm run migrate or npm run migrate:simple, or supabase db push) and try again.'
      )
    })
  })

  describe('Sign In', () => {
    it('signs in user with email and password', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
      const signInResult = await result.current.signIn('test@example.com', 'password123')
      
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      
      expect(signInResult.error).toBeUndefined()
    })

    it('handles sign in errors', async () => {
      const error = { message: 'Invalid credentials' }
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error,
      })
      
      const { result } = renderHook(() => useAuth())
      
      const signInResult = await result.current.signIn('test@example.com', 'wrongpassword')
      
      expect(signInResult.error).toEqual(error)
    })

    it('shows success message on successful sign in', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
      await result.current.signIn('test@example.com', 'password123')
      
      const { toast } = require('sonner')
      expect(toast.success).toHaveBeenCalledWith('Successfully signed in')
    })
  })

  describe('Sign Out', () => {
    it('signs out user', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
      
      const { result } = renderHook(() => useAuth())
      
      await result.current.signOut()
      
      expect(supabase.auth.signOut).toHaveBeenCalled()
    })

    it('handles sign out errors', async () => {
      const error = { message: 'Sign out failed' }
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error })
      
      const { result } = renderHook(() => useAuth())
      
      await result.current.signOut()
      
      const { toast } = require('sonner')
      expect(toast.error).toHaveBeenCalledWith('Sign out failed')
    })

    it('shows success message on successful sign out', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
      
      const { result } = renderHook(() => useAuth())
      
      await result.current.signOut()
      
      const { toast } = require('sonner')
      expect(toast.success).toHaveBeenCalledWith('Successfully signed out')
    })
  })

  describe('Update Profile', () => {
    it('updates user profile', async () => {
      // Set up initial state with user
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      
      const mockUpdate = vi.fn().mockResolvedValue({ error: null })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        update: mockUpdate.mockReturnThis(),
      } as any)
      
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const updates = { full_name: 'Updated Name', phone_verified: true }
      const updateResult = await result.current.updateProfile(updates)
      
      expect(mockUpdate).toHaveBeenCalledWith(updates)
      expect(updateResult.error).toBeUndefined()
    })

    it('handles update profile errors', async () => {
      // Set up initial state with user
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      
      const error = { message: 'Update failed' }
      const mockUpdate = vi.fn().mockResolvedValue({ error })
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        update: mockUpdate.mockReturnThis(),
      } as any)
      
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const updateResult = await result.current.updateProfile({ full_name: 'Updated Name' })
      
      expect(updateResult.error).toBe('Update failed')
    })

    it('returns error when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      const updateResult = await result.current.updateProfile({ full_name: 'Updated Name' })
      
      expect(updateResult.error).toBe('No user logged in')
    })
  })

  describe('Refresh Profile', () => {
    it('refreshes user profile data', async () => {
      // Set up initial state with user
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await result.current.refreshProfile()
      
      // Should fetch profile data again
      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })

    it('does nothing when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      await result.current.refreshProfile()
      
      // Should not make any database calls
      expect(result.current.profile).toBe(null)
    })
  })

  describe('Auth State Changes', () => {
    it('updates state when auth state changes', async () => {
      let authStateCallback: (event: string, session: any) => void
      
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })
      
      const { result } = renderHook(() => useAuth())
      
      // Simulate auth state change
      authStateCallback!('SIGNED_IN', mockSession)
      
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.session).toEqual(mockSession)
      })
    })

    it('clears state when user signs out', async () => {
      let authStateCallback: (event: string, session: any) => void
      
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authStateCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })
      
      const { result } = renderHook(() => useAuth())
      
      // Simulate sign out
      authStateCallback!('SIGNED_OUT', null)
      
      await waitFor(() => {
        expect(result.current.user).toBe(null)
        expect(result.current.profile).toBe(null)
        expect(result.current.session).toBe(null)
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('Profile Fetching', () => {
    it('handles profile fetch errors gracefully', async () => {
      const error = { message: 'Profile not found' }
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      } as any)
      
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.profile).toBe(null)
    })
  })
})
