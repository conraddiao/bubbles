import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@/test/utils'
import { MemberList } from '../member-list'
import * as database from '@/lib/database'

// Mock the database functions
vi.mock('@/lib/database', () => ({
  getGroupMembers: vi.fn(),
  removeGroupMember: vi.fn(),
  subscribeToGroupMembers: vi.fn(() => ({
    unsubscribe: vi.fn()
  }))
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago')
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

const mockMembers = [
  {
    id: '1',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    notifications_enabled: true,
    joined_at: '2024-01-01T00:00:00Z',
    is_owner: true
  },
  {
    id: '2',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    phone: undefined,
    notifications_enabled: false,
    joined_at: '2024-01-02T00:00:00Z',
    is_owner: false
  }
]

const mockGetGroupMembers = vi.mocked(database.getGroupMembers)
const mockRemoveGroupMember = vi.mocked(database.removeGroupMember)

describe('MemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockGetGroupMembers.mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    render(
      <MemberList 
        groupId="test-group" 
        groupName="Test Group" 
        isOwner={true} 
      />
    )

    expect(screen.getByText('Loading members...')).toBeInTheDocument()
  })

  it('renders empty state when no members', async () => {
    mockGetGroupMembers.mockResolvedValue({
      data: [],
      error: null
    })

    render(
      <MemberList 
        groupId="test-group" 
        groupName="Test Group" 
        isOwner={true} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No members have joined yet')).toBeInTheDocument()
    })
  })

  it('renders member list correctly', async () => {
    mockGetGroupMembers.mockResolvedValue({
      data: mockMembers,
      error: null
    })

    render(
      <MemberList 
        groupId="test-group" 
        groupName="Test Group" 
        isOwner={true} 
      />
    )

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('+1234567890')).toBeInTheDocument()
      expect(screen.getByText('Owner')).toBeInTheDocument()
    })
  })

  it('shows export button when onExportContacts is provided', async () => {
    mockGetGroupMembers.mockResolvedValue({
      data: mockMembers,
      error: null
    })

    const mockExport = vi.fn()

    render(
      <MemberList 
        groupId="test-group" 
        groupName="Test Group" 
        isOwner={true}
        onExportContacts={mockExport}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Export Contacts')).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    mockGetGroupMembers.mockResolvedValue({
      data: null,
      error: 'Failed to load members'
    })

    render(
      <MemberList 
        groupId="test-group" 
        groupName="Test Group" 
        isOwner={true} 
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText('Failed to load members')).toHaveLength(2)
    })
  })
})