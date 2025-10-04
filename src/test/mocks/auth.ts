import { vi } from 'vitest'
import { Profile } from '@/types'

export const mockProfile: Profile = {
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

export const mockAuthState = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
  },
  profile: mockProfile,
  session: {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh-token',
  },
  loading: false,
}

export const mockAuthActions = {
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  refreshProfile: vi.fn(),
}

export const createMockUseAuth = (overrides = {}) => {
  const state = {
    ...mockAuthState,
    ...overrides,
  }
  
  const actions = {
    ...mockAuthActions,
    updateProfile: vi.fn().mockImplementation(async (updates) => {
      // Update the mock profile state
      if (state.profile) {
        Object.assign(state.profile, updates)
      }
      return { error: undefined }
    }),
  }
  
  return {
    ...state,
    ...actions,
    ...overrides,
  }
}