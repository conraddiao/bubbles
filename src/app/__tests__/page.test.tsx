import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/utils'
import Home from '../page'
import { createMockUseAuth, mockProfile } from '@/test/mocks/auth'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() =>
    createMockUseAuth({ user: null, profile: null, loading: false })
  ),
}))

import { useAuth } from '@/hooks/use-auth'
const mockUseAuth = vi.mocked(useAuth)

describe('Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(
      createMockUseAuth({ user: null, profile: null, loading: false }) as ReturnType<typeof useAuth>
    )
  })

  it('renders heading and CTA buttons when logged out', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: 'Bubbles' })).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Log In')).toBeInTheDocument()
  })

  it('Get Started links to signup', () => {
    render(<Home />)
    const link = screen.getByText('Get Started').closest('a')
    expect(link).toHaveAttribute('href', '/auth?mode=signup')
  })

  it('Log In links to signin', () => {
    render(<Home />)
    const link = screen.getByText('Log In').closest('a')
    expect(link).toHaveAttribute('href', '/auth?mode=signin')
  })

  it('renders brand copy', () => {
    render(<Home />)
    expect(screen.getByText(/easiest way to swap contacts/)).toBeInTheDocument()
    expect(screen.getByText(/Made for real life/)).toBeInTheDocument()
  })

  it('redirects to /dashboard when authenticated with profile', () => {
    mockUseAuth.mockReturnValue(
      createMockUseAuth({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: mockProfile,
        loading: false,
      }) as ReturnType<typeof useAuth>
    )
    render(<Home />)
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('redirects to /profile/setup when user has no profile', () => {
    mockUseAuth.mockReturnValue(
      createMockUseAuth({
        user: { id: 'test-user-id', email: 'test@example.com' },
        profile: null,
        loading: false,
      }) as ReturnType<typeof useAuth>
    )
    render(<Home />)
    expect(mockPush).toHaveBeenCalledWith('/profile/setup')
  })

  it('shows spinner while loading', () => {
    mockUseAuth.mockReturnValue(
      createMockUseAuth({ loading: true, user: null, profile: null }) as ReturnType<typeof useAuth>
    )
    const { container } = render(<Home />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
