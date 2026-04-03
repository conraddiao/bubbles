import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import DashboardPage from '../page'
import { createMockUseAuth } from '@/test/mocks/auth'
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
  createContactGroup: vi.fn(),
  getArchivedGroups: vi.fn(),
}))

import { useAuth } from '@/hooks/use-auth'
const mockUseAuth = vi.mocked(useAuth)
const mockGetUserGroups = vi.mocked(database.getUserGroups)
const mockCreateContactGroup = vi.mocked(database.createContactGroup)
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
    mockCreateContactGroup.mockResolvedValue({ data: { group_id: 'new-id' }, error: null } as any)
  })

  it('renders empty state when no groups', async () => {
    mockGetUserGroups.mockResolvedValue({ data: [], error: null })
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('No groups yet. Tap New Group to get started.')).toBeInTheDocument()
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

  it('has New Group button that creates a group and navigates', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    const newGroupBtn = screen.getByRole('button', { name: /New Group/ })
    expect(newGroupBtn).toBeInTheDocument()

    await user.click(newGroupBtn)

    await waitFor(() => {
      expect(mockCreateContactGroup).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/groups/new-id?created=true')
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
