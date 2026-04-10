import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { GroupDetail } from '../group-detail'
import { createMockUseAuth } from '@/test/mocks/auth'
import * as database from '@/lib/database'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/group/abc123',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => createMockUseAuth()),
}))

// QRCodeSVG doesn't render in jsdom; replace with a simple placeholder
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-code" data-value={value} />,
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
  archiveContactGroup: vi.fn(),
  unarchiveContactGroup: vi.fn(),
  getShareLinkAnalytics: vi.fn().mockResolvedValue({ data: null, error: null }),
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

describe('GroupDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSupabaseMock()
    mockGetGroupMembers.mockResolvedValue({ data: mockMembers, error: null })
  })

  it('renders loading skeleton initially', () => {
    mockSingle.mockReturnValue(new Promise(() => {}))

    const { container } = render(<GroupDetail token="abc123" />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders group name in QR hero', async () => {
    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      const names = screen.getAllByText('Wedding Party')
      expect(names.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows live member count in QR hero', async () => {
    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByText('1 joined so far')).toBeInTheDocument()
    })
  })

  it('shows QR code when share URL is available', async () => {
    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    })
  })

  it('renders settings menu button', async () => {
    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Group settings' })).toBeInTheDocument()
    })
  })

  it('owner opens drawer and sees save button', async () => {
    const user = userEvent.setup()
    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Group settings' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Group settings' }))

    await waitFor(() => {
      expect(screen.getByText('Save changes')).toBeInTheDocument()
    })
  })

  it('non-owner opens drawer and does not see save button', async () => {
    setupSupabaseMock({ ...mockGroup, owner_id: 'other-user-id' })

    const user = userEvent.setup()
    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Group settings' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Group settings' }))

    await waitFor(() => {
      expect(screen.getByText('Leave group')).toBeInTheDocument()
    })
    expect(screen.queryByText('Save changes')).not.toBeInTheDocument()
  })

  it('leave group button triggers confirmation (non-owner)', async () => {
    setupSupabaseMock({ ...mockGroup, owner_id: 'other-user-id' })

    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockLeaveGroup.mockResolvedValue({ data: null, error: null })

    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Group settings' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Group settings' }))

    await waitFor(() => {
      expect(screen.getByText('Leave group')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Leave group/ }))

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to leave this group?')
    expect(mockLeaveGroup).toHaveBeenCalledWith('g1')
    confirmSpy.mockRestore()
  })

  it('shows error state when group is not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByText('Group not found')).toBeInTheDocument()
    })
  })

  it('shows archived banner when group has archived_at set', async () => {
    setupSupabaseMock({ ...mockGroup, archived_at: '2026-03-01T00:00:00Z' })

    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByText('This group is archived')).toBeInTheDocument()
    })
  })

  it('does not show Archived badge for non-archived group', async () => {
    render(<GroupDetail token="abc123" />)
    await waitFor(() => {
      expect(screen.getByText('Wedding Party')).toBeInTheDocument()
    })
    expect(screen.queryByText('Archived')).not.toBeInTheDocument()
  })
})
