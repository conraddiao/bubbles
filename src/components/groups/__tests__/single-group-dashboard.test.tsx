import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { SingleGroupDashboard } from '../single-group-dashboard'
import { createMockUseAuth } from '@/test/mocks/auth'
import * as database from '@/lib/database'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/groups/g1',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => createMockUseAuth()),
}))

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
  },
  handleDatabaseError: vi.fn((e: unknown) => String(e)),
}))

vi.mock('@/lib/database', () => ({
  getGroupMembers: vi.fn(),
  removeGroupMember: vi.fn(),
  updateGroupDetails: vi.fn(),
  leaveGroup: vi.fn(),
  subscribeToGroupMembers: vi.fn(() => ({
    unsubscribe: vi.fn(),
  })),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

const mockGetGroupMembers = vi.mocked(database.getGroupMembers)
const mockLeaveGroup = vi.mocked(database.leaveGroup)

const mockGroup = {
  id: 'g1',
  name: 'Wedding Party',
  description: 'Our big day contacts',
  owner_id: 'test-user-id',
  share_token: 'abc123',
  access_type: 'open' as const,
  is_closed: false,
  join_password_hash: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockMembers = [
  {
    id: 'm1',
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    phone: '+1234567890',
    notifications_enabled: true,
    joined_at: '2024-01-01T00:00:00Z',
    is_owner: true,
  },
]

function setupSupabaseMock(groupData = mockGroup) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } },
    error: null,
  })
  mockSingle.mockResolvedValue({ data: groupData, error: null })
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: mockSingle,
      }),
    }),
  })
}

describe('SingleGroupDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSupabaseMock()
    mockGetGroupMembers.mockResolvedValue({ data: mockMembers, error: null })
  })

  it('renders loading skeleton initially', () => {
    mockSingle.mockReturnValue(new Promise(() => {}))

    const { container } = render(<SingleGroupDashboard groupId="g1" />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders group name and description', async () => {
    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText('Wedding Party')).toBeInTheDocument()
      // Description appears in both the display <p> and settings <textarea>
      expect(screen.getAllByText('Our big day contacts').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows correct badges for open group', async () => {
    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText('Accepting members')).toBeInTheDocument()
    })
    // "Open link" appears both in header badge and settings section
    expect(screen.getAllByText('Open link').length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct badge for closed group', async () => {
    setupSupabaseMock({ ...mockGroup, is_closed: true })

    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText('Closed to new members')).toBeInTheDocument()
    })
  })

  it('shows member count', async () => {
    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText(/1 member can access this group/)).toBeInTheDocument()
    })
  })

  it('owner sees save button', async () => {
    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText('Save changes')).toBeInTheDocument()
    })
  })

  it('non-owner does not see save button', async () => {
    setupSupabaseMock({ ...mockGroup, owner_id: 'other-user-id' })

    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText('Wedding Party')).toBeInTheDocument()
    })
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
  })

  it('leave group button triggers confirmation', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockLeaveGroup.mockResolvedValue({ data: null, error: null })

    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText('Wedding Party')).toBeInTheDocument()
    })

    const leaveButton = screen.getByRole('button', { name: /Leave group/ })
    await user.click(leaveButton)

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to leave this group?')
    expect(mockLeaveGroup).toHaveBeenCalledWith('g1')
    confirmSpy.mockRestore()
  })

  it('has icon-only button with aria-label', async () => {
    render(<SingleGroupDashboard groupId="g1" />)
    await waitFor(() => {
      expect(screen.getByText('Wedding Party')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Open share link in new tab' })).toBeInTheDocument()
  })
})
