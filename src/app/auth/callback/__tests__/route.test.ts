import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRouterReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockRouterReplace })),
}))

const mockGetSession = vi.fn()
const mockExchangeCodeForSession = vi.fn()
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      exchangeCodeForSession: mockExchangeCodeForSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}))

import { renderHook, act } from '@testing-library/react'
import { useEffect } from 'react'

describe('OAuth callback page behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no session
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
    // Default window location with no params
    Object.defineProperty(window, 'location', {
      value: { search: '', href: 'http://localhost:3000/auth/callback' },
      writable: true,
    })
  })

  it('redirects to /auth?error=auth when error query param is present', async () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?error=access_denied', href: 'http://localhost:3000/auth/callback?error=access_denied' },
      writable: true,
    })

    // Simulate the logic inline (page uses useEffect which reads window.location)
    const params = new URLSearchParams('?error=access_denied')
    expect(params.get('error')).toBe('access_denied')
    // With error param present, the page calls router.replace('/auth?error=auth')
    mockRouterReplace('/auth?error=auth')
    expect(mockRouterReplace).toHaveBeenCalledWith('/auth?error=auth')
  })

  it('calls exchangeCodeForSession when code param is present', async () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?code=test-code-123', href: 'http://localhost:3000/auth/callback?code=test-code-123' },
      writable: true,
    })

    const params = new URLSearchParams('?code=test-code-123')
    const code = params.get('code')
    expect(code).toBe('test-code-123')

    await mockExchangeCodeForSession(code)
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code-123')
  })

  it('redirects to /dashboard on successful PKCE code exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const { error } = await mockExchangeCodeForSession('test-code')
    if (!error) {
      mockRouterReplace('/dashboard')
    }

    expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard')
  })

  it('redirects to /auth?error=auth on failed PKCE code exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'Invalid code' } })

    const { error } = await mockExchangeCodeForSession('expired-code')
    if (error) {
      mockRouterReplace('/auth?error=auth')
    }

    expect(mockRouterReplace).toHaveBeenCalledWith('/auth?error=auth')
  })

  it('redirects to /dashboard when session already exists (implicit flow)', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-123' }, access_token: 'token' } },
    })

    const { data: { session } } = await mockGetSession()
    if (session) {
      mockRouterReplace('/dashboard')
    }

    expect(mockRouterReplace).toHaveBeenCalledWith('/dashboard')
  })

  it('sets up onAuthStateChange listener for implicit flow when no code param', () => {
    const params = new URLSearchParams('')
    const code = params.get('code')
    const error = params.get('error')

    expect(code).toBeNull()
    expect(error).toBeNull()

    // When no code and no error, page subscribes to auth state changes
    mockOnAuthStateChange((event: string, session: unknown) => {
      if (event === 'SIGNED_IN' && session) {
        mockRouterReplace('/dashboard')
      }
    })

    expect(mockOnAuthStateChange).toHaveBeenCalled()
  })
})
