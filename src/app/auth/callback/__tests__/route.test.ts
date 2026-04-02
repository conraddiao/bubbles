import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock @supabase/ssr
const mockExchangeCodeForSession = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}))

// Must import after mocks
import { GET } from '../route'

describe('OAuth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('redirects to /auth?error=auth when no code param is present', async () => {
    const request = new NextRequest('http://localhost:3000/auth/callback')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/auth?error=auth')
  })

  it('calls exchangeCodeForSession with the code param', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost:3000/auth/callback?code=test-code')

    await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code')
  })

  it('redirects to /dashboard on successful code exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost:3000/auth/callback?code=test-code')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
  })

  it('redirects to custom next param on success', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost:3000/auth/callback?code=test-code&next=/groups/123')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/groups/123')
  })

  it('redirects to /auth?error=auth on exchange failure', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: 'Invalid code' },
    })

    const request = new NextRequest('http://localhost:3000/auth/callback?code=expired-code')

    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/auth?error=auth')
  })
})
