import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { MemberList } from '../member-list'
import * as database from '@/lib/database'
import { toast } from 'sonner'

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

// Mock useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    profile: {
      id: 'test-user-id',
      email: 'test@example.com',
      phone: '+1234567890',
    },
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: null,
    loading: false,
  })
}))

const mockMembers = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    avatar_url: null,
    notifications_enabled: true,
    joined_at: '2024-01-01T00:00:00Z',
    is_owner: true
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: undefined,
    avatar_url: null,
    notifications_enabled: false,
    joined_at: '2024-01-02T00:00:00Z',
    is_owner: false
  }
]

const mockGetGroupMembers = vi.mocked(database.getGroupMembers)

describe('MemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a loading skeleton initially', () => {
    mockGetGroupMembers.mockReturnValue(
      new Promise(() => {}) // Never resolves
    )

    const { container } = render(
      <MemberList
        groupId="test-group"
        groupName="Test Group"
        isOwner={true}
      />
    )

    expect(screen.getByText('Group Members')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
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
      expect(
        screen.getByText('Share your group link to start collecting contact information.')
      ).toBeInTheDocument()
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
      // Mobile card list and desktop table both render in jsdom.
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Owner').length).toBeGreaterThan(0)
      expect(screen.getByText('2 members in Test Group')).toBeInTheDocument()
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
      expect(screen.getByText('Failed to load members')).toBeInTheDocument()
    })
  })
})

// Tests for multi-select + per-member "get contact" button.
// Runs against the mobile layout (md:hidden) since jsdom has no viewport.
describe('MemberList — contact selection', () => {
  const originalUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const originalCreateObjectURL = typeof URL !== 'undefined' ? URL.createObjectURL : undefined
  const originalRevokeObjectURL = typeof URL !== 'undefined' ? URL.revokeObjectURL : undefined

  const setUserAgent = (value: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value,
      configurable: true,
      writable: true,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Non-iOS by default so the get-contact button uses the blob download path.
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
    mockGetGroupMembers.mockResolvedValue({ data: mockMembers, error: null })
    if (typeof URL !== 'undefined') {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      URL.revokeObjectURL = vi.fn()
    }
  })

  afterEach(() => {
    setUserAgent(originalUserAgent)
    if (typeof URL !== 'undefined') {
      if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL
      if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL
    }
    vi.restoreAllMocks()
  })

  const renderList = () =>
    render(
      <MemberList groupId="test-group" groupName="Test Group" isOwner={true} />
    )

  const waitForMembers = async () => {
    // Mobile + desktop layouts both render in jsdom (media queries don't apply)
    // so the same member name appears twice; use getAllByText to accept either.
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    })
  }

  // Same reason — each member has a mobile row checkbox AND a desktop table row
  // checkbox. We only need to click one of them to exercise the state.
  const getRowCheckbox = (name: string) =>
    screen.getAllByRole('checkbox', { name: `Select ${name}` })[0]

  // The mobile card wrapping a member — the whole card toggles selection.
  const getMemberCard = (name: string) => {
    const card = getRowCheckbox(name).closest('div.cursor-pointer')
    if (!card) throw new Error(`No clickable card found for ${name}`)
    return card
  }

  it('renders a select-all checkbox and one checkbox per member (mobile)', async () => {
    renderList()
    await waitForMembers()

    // Mobile: select-all + 2 rows = 3 mobile checkboxes. Desktop table duplicates
    // these, so in jsdom we'll actually see 6 checkboxes (md:hidden does not
    // remove them). Just sanity check the labeled ones.
    expect(
      screen.getAllByRole('checkbox', { name: 'Select all members' }).length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByRole('checkbox', { name: 'Select John Doe' }).length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByRole('checkbox', { name: 'Select Jane Smith' }).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('selects every member by default', async () => {
    renderList()
    await waitForMembers()

    expect(getRowCheckbox('John Doe')).toBeChecked()
    expect(getRowCheckbox('Jane Smith')).toBeChecked()
    expect(
      screen.getByRole('button', { name: /Get Contacts \(2\)/ })
    ).toBeInTheDocument()
  })

  it('toggling a member updates the Get Contacts button label with a count', async () => {
    renderList()
    await waitForMembers()

    // Baseline: everyone selected
    expect(
      screen.getByRole('button', { name: /Get Contacts \(2\)/ })
    ).toBeInTheDocument()

    fireEvent.click(getRowCheckbox('Jane Smith'))

    expect(
      screen.getByRole('button', { name: /Get Contacts \(1\)/ })
    ).toBeInTheDocument()
  })

  it('clicking a member card deselects it, clicking again re-selects', async () => {
    renderList()
    await waitForMembers()

    const card = getMemberCard('Jane Smith')
    fireEvent.click(card)

    expect(getRowCheckbox('Jane Smith')).not.toBeChecked()
    expect(
      screen.getByRole('button', { name: /Get Contacts \(1\)/ })
    ).toBeInTheDocument()

    fireEvent.click(card)

    expect(getRowCheckbox('Jane Smith')).toBeChecked()
    expect(
      screen.getByRole('button', { name: /Get Contacts \(2\)/ })
    ).toBeInTheDocument()
  })

  it('clicking a row action button does not change the selection', async () => {
    renderList()
    await waitForMembers()

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    fireEvent.click(
      screen.getAllByRole('button', { name: "Get Jane Smith's contact" })[0]
    )

    expect(getRowCheckbox('Jane Smith')).toBeChecked()
    expect(
      screen.getByRole('button', { name: /Get Contacts \(2\)/ })
    ).toBeInTheDocument()
  })

  it('clear then select all round-trip updates the header', async () => {
    renderList()
    await waitForMembers()

    // Everything starts selected — clear it.
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(
      screen.getByRole('button', { name: /^Get Contacts$/ })
    ).toBeInTheDocument()

    // Click the first "Select all members" checkbox (mobile row)
    const [selectAll] = screen.getAllByRole('checkbox', {
      name: 'Select all members',
    })
    fireEvent.click(selectAll)

    expect(
      screen.getByRole('button', { name: /Get Contacts \(2\)/ })
    ).toBeInTheDocument()
  })

  it('per-member get button downloads a vcf blob on non-iOS', async () => {
    renderList()
    await waitForMembers()

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    // Jane is the non-owner row; use her button. There are two rows (mobile +
    // desktop), click the first.
    const getButtons = screen.getAllByRole('button', {
      name: "Get Jane Smith's contact",
    })
    fireEvent.click(getButtons[0])

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
  })

  it('per-member get button uses a data URI on iOS', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    )
    renderList()
    await waitForMembers()

    // Intercept window.location assignments
    const originalLocation = window.location
    const hrefSpy = vi.fn()
    // @ts-expect-error override for test
    delete window.location
    // @ts-expect-error override for test
    window.location = {
      ...originalLocation,
      set href(value: string) {
        hrefSpy(value)
      },
      get href() {
        return originalLocation.href
      },
    }

    try {
      const getButtons = screen.getAllByRole('button', {
        name: "Get Jane Smith's contact",
      })
      fireEvent.click(getButtons[0])

      expect(hrefSpy).toHaveBeenCalled()
      const arg = hrefSpy.mock.calls[0][0] as string
      expect(arg.startsWith('data:text/x-vcard')).toBe(true)
    } finally {
      // @ts-expect-error restore
      window.location = originalLocation
    }
  })

  it('Get Contacts with a selection posts memberIds to the SMS API', async () => {
    renderList()
    await waitForMembers()

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    // Deselect John, leaving Jane selected.
    fireEvent.click(getRowCheckbox('John Doe'))
    fireEvent.click(
      screen.getByRole('button', { name: /Get Contacts \(1\)/ })
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.memberIds).toEqual(['2'])
    expect(body.groupId).toBe('test-group')
  })

  it('Get Contacts keeps the selection after sending', async () => {
    renderList()
    await waitForMembers()

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    fireEvent.click(screen.getByRole('button', { name: /Get Contacts \(2\)/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Get Contacts \(2\)/ })
      ).toBeInTheDocument()
    )
  })

  it('Get Contacts with no selection omits memberIds', async () => {
    renderList()
    await waitForMembers()

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(screen.getByRole('button', { name: /^Get Contacts$/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse((init as RequestInit).body as string)
    expect('memberIds' in body).toBe(false)
  })

  it('get button is visible for every member including the owner', async () => {
    renderList()
    await waitForMembers()

    // Both John (owner) and Jane (non-owner) should have get-contact buttons
    expect(
      screen.getAllByRole('button', { name: "Get John Doe's contact" }).length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByRole('button', { name: "Get Jane Smith's contact" }).length
    ).toBeGreaterThanOrEqual(1)
    // And the owner-only trash button is still present for the non-owner row only
    expect(
      screen.getAllByRole('button', { name: /Remove Jane Smith from group/ })
        .length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.queryAllByRole('button', { name: /Remove John Doe from group/ })
    ).toHaveLength(0)
  })
})

// The export dropdown next to "Get Contacts".
describe('MemberList — export menu', () => {
  const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  const DESKTOP_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
  const originalUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

  const setUserAgent = (value: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value,
      configurable: true,
      writable: true,
    })
  }

  const mockShare = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // An earlier suite's restoreAllMocks() strips the global ResizeObserver
    // stub from test setup; Radix's popper needs it to open the dropdown.
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
    mockGetGroupMembers.mockResolvedValue({ data: mockMembers, error: null })
    mockShare.mockReset()
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
  })

  afterEach(() => {
    setUserAgent(originalUserAgent)
    vi.restoreAllMocks()
  })

  const renderAndOpenMenu = async () => {
    const user = userEvent.setup()
    render(
      <MemberList groupId="test-group" groupName="Test Group" isOwner={true} />
    )
    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    })
    await user.click(screen.getByRole('button', { name: 'Export options' }))
    return user
  }

  it('offers Share but never Add on iOS — Add is covered by Get Contacts', async () => {
    setUserAgent(IOS_UA)
    await renderAndOpenMenu()

    expect(await screen.findByText(/Share Selected \(2\)/)).toBeInTheDocument()
    expect(screen.queryByText(/^Add /)).not.toBeInTheDocument()
  })

  it('offers Export on desktop', async () => {
    setUserAgent(DESKTOP_UA)
    await renderAndOpenMenu()

    expect(await screen.findByText(/Export Selected \(2\)/)).toBeInTheDocument()
  })

  it('does not toast success when the share sheet is dismissed', async () => {
    setUserAgent(IOS_UA)
    mockShare.mockRejectedValue(new DOMException('Share cancelled', 'AbortError'))
    await renderAndOpenMenu()

    fireEvent.click(await screen.findByText(/Share Selected \(2\)/))

    await waitFor(() => expect(mockShare).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('toasts success when the share completes', async () => {
    setUserAgent(IOS_UA)
    mockShare.mockResolvedValue(undefined)
    await renderAndOpenMenu()

    fireEvent.click(await screen.findByText(/Share Selected \(2\)/))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 contacts exported'))
  })
})
