import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { GroupSettings } from '../group-settings'
import * as database from '@/lib/database'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  },
}))

vi.mock('@/lib/database', () => ({
  getGroupMembers: vi.fn(),
  removeGroupMember: vi.fn(),
  closeContactGroup: vi.fn(),
  archiveContactGroup: vi.fn(),
  unarchiveContactGroup: vi.fn(),
  regenerateGroupToken: vi.fn(),
  getUserGroups: vi.fn(),
  getArchivedGroups: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

const mockGetGroupMembers = vi.mocked(database.getGroupMembers)
const mockGetUserGroups = vi.mocked(database.getUserGroups)
const mockGetArchivedGroups = vi.mocked(database.getArchivedGroups)
const mockArchiveContactGroup = vi.mocked(database.archiveContactGroup)
const mockUnarchiveContactGroup = vi.mocked(database.unarchiveContactGroup)

const mockActiveGroup = {
  id: 'g1',
  name: 'Test Group',
  description: 'A test group',
  owner_id: 'test-user-id',
  share_token: 'abc123',
  access_type: 'open' as const,
  is_closed: false,
  archived_at: null,
  join_password_hash: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockArchivedGroup = {
  ...mockActiveGroup,
  archived_at: '2026-03-01T00:00:00Z',
}

function setup(group = mockActiveGroup) {
  const isArchived = !!group.archived_at
  mockGetUserGroups.mockResolvedValue({ data: isArchived ? [] : [group], error: null })
  mockGetArchivedGroups.mockResolvedValue({ data: isArchived ? [group] : [], error: null })
  mockGetGroupMembers.mockResolvedValue({ data: [], error: null })
}

describe('GroupSettings — archive feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Archive button for owner of active group', async () => {
    setup(mockActiveGroup)

    render(<GroupSettings groupId="g1" />)

    // Switch to settings tab
    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    const settingsTab = screen.getByRole('button', { name: /Settings/ })
    await userEvent.setup().click(settingsTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Archive Group/ })).toBeInTheDocument()
    })
  })

  it('shows Unarchive button for owner of archived group', async () => {
    setup(mockArchivedGroup)

    render(<GroupSettings groupId="g1" />)

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    const settingsTab = screen.getByRole('button', { name: /Settings/ })
    await userEvent.setup().click(settingsTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Unarchive Group/ })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /Archive Group/ })).not.toBeInTheDocument()
  })

  it('does not show Close Group button for archived group', async () => {
    setup(mockArchivedGroup)

    render(<GroupSettings groupId="g1" />)

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    const settingsTab = screen.getByRole('button', { name: /Settings/ })
    await userEvent.setup().click(settingsTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Unarchive Group/ })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /Close Group/ })).not.toBeInTheDocument()
  })

  it('calls archiveContactGroup on confirm', async () => {
    setup(mockActiveGroup)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockArchiveContactGroup.mockResolvedValue({ data: true, error: null })

    render(<GroupSettings groupId="g1" />)

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    const settingsTab = screen.getByRole('button', { name: /Settings/ })
    await userEvent.setup().click(settingsTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Archive Group/ })).toBeInTheDocument()
    })

    await userEvent.setup().click(screen.getByRole('button', { name: /Archive Group/ }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(mockArchiveContactGroup).toHaveBeenCalledWith('g1')

    confirmSpy.mockRestore()
  })

  it('does NOT call archiveContactGroup when confirm is cancelled', async () => {
    setup(mockActiveGroup)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<GroupSettings groupId="g1" />)

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    const settingsTab = screen.getByRole('button', { name: /Settings/ })
    await userEvent.setup().click(settingsTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Archive Group/ })).toBeInTheDocument()
    })

    await userEvent.setup().click(screen.getByRole('button', { name: /Archive Group/ }))

    expect(mockArchiveContactGroup).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('calls unarchiveContactGroup directly without confirm', async () => {
    setup(mockArchivedGroup)
    mockUnarchiveContactGroup.mockResolvedValue({ data: true, error: null })

    render(<GroupSettings groupId="g1" />)

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
    })

    const settingsTab = screen.getByRole('button', { name: /Settings/ })
    await userEvent.setup().click(settingsTab)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Unarchive Group/ })).toBeInTheDocument()
    })

    await userEvent.setup().click(screen.getByRole('button', { name: /Unarchive Group/ }))

    expect(mockUnarchiveContactGroup).toHaveBeenCalledWith('g1')
  })
})
