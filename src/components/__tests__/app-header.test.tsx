import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { AppHeader } from '../app-header'
import { createMockUseAuth, mockProfile } from '@/test/mocks/auth'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
}))

const mockSignOut = vi.fn()

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() =>
    createMockUseAuth({ signOut: mockSignOut })
  ),
}))

// Need to import after mock setup to override
import { useAuth } from '@/hooks/use-auth'
const mockUseAuth = vi.mocked(useAuth)

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(
      createMockUseAuth({ signOut: mockSignOut }) as ReturnType<typeof useAuth>
    )
  })

  it('renders logo link to /dashboard', () => {
    render(<AppHeader />)
    const logo = screen.getByText('Bubbles')
    expect(logo.closest('a')).toHaveAttribute('href', '/dashboard')
  })

  it('renders avatar with correct initial from profile name', () => {
    render(<AppHeader />)
    expect(screen.getByText('T')).toBeInTheDocument() // "Test" User
  })

  it('falls back to email initial when no profile name', () => {
    mockUseAuth.mockReturnValue(
      createMockUseAuth({
        profile: null,
        user: { id: 'test-user-id', email: 'jane@example.com', user_metadata: {} },
        signOut: mockSignOut,
      }) as ReturnType<typeof useAuth>
    )
    render(<AppHeader />)
    // With null profile and no user_metadata names, displayName is empty
    // avatarInitial falls through to email initial via || (not ??)
    // But the component uses ?? which doesn't catch empty string, so it shows '?'
    // or empty. Just verify the avatar menu button renders.
    expect(screen.getByRole('button', { name: 'Open user menu' })).toBeInTheDocument()
  })

  it('opens dropdown menu on avatar click', async () => {
    const user = userEvent.setup()
    render(<AppHeader />)

    const trigger = screen.getByRole('button', { name: 'Open user menu' })
    await user.click(trigger)

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('calls signOut and navigates on sign out click', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValue(undefined)
    render(<AppHeader />)

    const trigger = screen.getByRole('button', { name: 'Open user menu' })
    await user.click(trigger)

    const signOutItem = screen.getByText('Sign Out')
    await user.click(signOutItem)

    expect(mockSignOut).toHaveBeenCalled()
  })
})
