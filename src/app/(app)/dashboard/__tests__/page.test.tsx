import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import DashboardPage from '../page'
import { createMockUseAuth, mockProfile } from '@/test/mocks/auth'
import * as database from '@/lib/database'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() =>
    createMockUseAuth()
  ),
}))

vi.mock('@/lib/database', () => ({
  getUserGroups: vi.fn(),
  getGroupByToken: vi.fn(),
  getArchivedGroups: vi.fn(),
}))

import { useAuth } from '@/hooks/use-auth'
const mockUseAuth = vi.mocked(useAuth)
const mockGetUserGroups = vi.mocked(database.getUserGroups)
const mockGetGroupByToken = vi.mocked(database.getGroupByToken)
const mockGetArchivedGroups = vi.mocked(database.getArchivedGroups)

const mockGroups = [
  { id: 'g1', name: 'Wedding Party', is_owner: true, member_count: 12, share_token: 'abc123' },
  { id: 'g2', name: 'Park Hangout', is_owner: false, member_count: 5, share_token: 'def456' },
]

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue(
      createMockUseAuth() as ReturnType<typeof useAuth>
    )
    mockGetUserGroups.mockResolvedValue({ data: mockGroups, error: null })
    mockGetArchivedGroups.mockResolvedValue({ data: [], error: null })
  })

  it('renders greeting with user name', async () => {
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Test User!/)).toBeInTheDocument()
    })
  })

  it('renders empty state when no groups', async () => {
    mockGetUserGroups.mockResolvedValue({ data: [], error: null })
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('No groups yet. Create one or join with an invite code.')).toBeInTheDocument()
    })
  })

  it('renders group list with names and member counts', async () => {
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Wedding Party')).toBeInTheDocument()
      expect(screen.getByText('12 members')).toBeInTheDocument()
      expect(screen.getByText('Park Hangout')).toBeInTheDocument()
      expect(screen.getByText('5 members')).toBeInTheDocument()
    })
  })

  it('group cards link to correct routes', async () => {
    render(<DashboardPage />)
    await waitFor(() => {
      const weddingLink = screen.getByText('Wedding Party').closest('a')
      expect(weddingLink).toHaveAttribute('href', '/groups/g1')
      const parkLink = screen.getByText('Park Hangout').closest('a')
      expect(parkLink).toHaveAttribute('href', '/groups/g2')
    })
  })

  it('shows Owner badge for owned groups', async () => {
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument()
    })
  })

  it('join form shows error for empty input', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
    })

    const joinButton = screen.getByRole('button', { name: /Join/ })
    await user.click(joinButton)

    await waitFor(() => {
      expect(screen.getByText('Enter a group code to continue.')).toBeInTheDocument()
    })
  })

  it('join form navigates on valid code', async () => {
    const user = userEvent.setup()
    mockGetGroupByToken.mockResolvedValue({ data: { id: 'g3' } as any, error: null })
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Enter invite code')
    await user.type(input, 'testcode')

    const joinButton = screen.getByRole('button', { name: /Join/ })
    await user.click(joinButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/join/testcode')
    })
  })

  it('has New Group button linking to create page', async () => {
    render(<DashboardPage />)
    await waitFor(() => {
      const newGroupLink = screen.getByText('New Group').closest('a')
      expect(newGroupLink).toHaveAttribute('href', '/groups/create')
    })
  })

  it('does not render archived section when no archived groups', async () => {
    mockGetArchivedGroups.mockResolvedValue({ data: [], error: null })
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Wedding Party')).toBeInTheDocument()
    })
    expect(screen.queryByText(/Archived groups/)).not.toBeInTheDocument()
  })

  it('renders archived section toggle when archived groups exist', async () => {
    mockGetArchivedGroups.mockResolvedValue({
      data: [{ id: 'g-old', name: 'Old Group', is_owner: true, member_count: 2, share_token: 'old1' }],
      error: null,
    })
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/Archived groups/)).toBeInTheDocument()
    })
    // Archived group name hidden by default (collapsed)
    expect(screen.queryByText('Old Group')).not.toBeInTheDocument()
  })

  it('shows archived groups after clicking the toggle', async () => {
    const user = userEvent.setup()
    mockGetArchivedGroups.mockResolvedValue({
      data: [{ id: 'g-old', name: 'Old Group', is_owner: true, member_count: 2, share_token: 'old1' }],
      error: null,
    })
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/Archived groups/)).toBeInTheDocument()
    })

    await user.click(screen.getByText(/Archived groups/))

    await waitFor(() => {
      expect(screen.getByText('Old Group')).toBeInTheDocument()
    })
  })
})
