import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { ContactExport } from '../contact-export'
import * as database from '@/lib/database'

vi.mock('@/lib/database', () => ({
  getGroupMembers: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockMembers = [
  {
    id: '1',
    first_name: 'Jane',
    last_name: "O'Brien",
    email: 'jane@example.com',
    phone: '+1-555-0100',
    avatar_url: 'https://example.com/avatar.jpg',
    notifications_enabled: true,
    joined_at: '2024-01-01',
    is_owner: false,
  },
  {
    id: '2',
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@example.com',
    phone: undefined,
    avatar_url: null,
    notifications_enabled: true,
    joined_at: '2024-01-02',
    is_owner: true,
  },
]

const mockGetGroupMembers = vi.mocked(database.getGroupMembers)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupMocks() {
  mockGetGroupMembers.mockResolvedValue({ data: mockMembers as any, error: null })
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'

// Wait for members to be loaded into the component (ensures React Query resolved)
async function waitForMembers() {
  await screen.findByText("Jane O'Brien")
}

beforeEach(() => {
  vi.clearAllMocks()
  setUserAgent(DESKTOP_UA)
  setupMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── generateBulkVCard ────────────────────────────────────────────────────────

describe('generateBulkVCard', () => {
  it('joins two vCards with \\r\\n\\r\\n separator', async () => {
    const user = userEvent.setup()
    // Capture blob parts by intercepting the Blob constructor
    let capturedContent = ''
    const OrigBlob = global.Blob
    global.Blob = class MockBlob extends OrigBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        capturedContent = parts.map(String).join('')
      }
    } as typeof Blob

    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    await user.click(screen.getByRole('button', { name: 'Export options' }))
    await screen.findByText(/Export All/)
    fireEvent.click(screen.getByText(/Export All/))

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())

    expect((capturedContent.match(/BEGIN:VCARD/g) || []).length).toBe(2)
    expect(capturedContent).toMatch(/END:VCARD\r\n\r\nBEGIN:VCARD/)

    global.Blob = OrigBlob
  })
})

// ─── downloadViaBlob (desktop) ───────────────────────────────────────────────

describe('downloadViaBlob', () => {
  it('creates a blob URL, triggers <a> click, and revokes the URL', async () => {
    const user = userEvent.setup()
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    await user.click(screen.getByRole('button', { name: 'Export options' }))
    await screen.findByText(/Export All/)
    fireEvent.click(screen.getByText(/Export All/))

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled())
    expect(clickSpy).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})

// ─── downloadViaDataUri (iOS direct path) ────────────────────────────────────

describe('downloadViaDataUri', () => {
  beforeEach(() => {
    setUserAgent(IOS_UA)
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
  })

  it('sets window.location.href to a data:text/x-vcard URI', async () => {
    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    const addBtns = screen.getAllByTitle('Open in Contacts app')
    fireEvent.click(addBtns[0]) // "Add All" header button

    await waitFor(() =>
      expect((window.location as { href: string }).href).toMatch(
        /^data:text\/x-vcard;charset=utf-8,/
      )
    )
  })

  it('URI-encodes the vCard content (no raw newlines in payload)', async () => {
    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    const addBtns = screen.getAllByTitle('Open in Contacts app')
    fireEvent.click(addBtns[0])

    await waitFor(() => {
      const href = (window.location as { href: string }).href
      expect(href).toMatch(/^data:text\/x-vcard;charset=utf-8,/)
    })

    const href = (window.location as { href: string }).href
    const encoded = href.replace('data:text/x-vcard;charset=utf-8,', '')
    expect(encoded).not.toContain('\n')
    expect(encoded).not.toContain('\r')
  })
})

// ─── downloadViaShare (iOS share sheet path) ─────────────────────────────────

describe('downloadViaShare', () => {
  const mockShare = vi.fn()
  const mockCanShare = vi.fn(() => true)

  beforeEach(() => {
    setUserAgent(IOS_UA)
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true })
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
    mockShare.mockReset()
    mockCanShare.mockReturnValue(true)
  })

  it('calls navigator.share with a .vcf File', async () => {
    mockShare.mockResolvedValue(undefined)

    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    const shareBtns = screen.getAllByTitle('Share via iOS share sheet')
    fireEvent.click(shareBtns[0]) // "Share All" bulk header button

    await waitFor(() => expect(mockShare).toHaveBeenCalledTimes(1))
    const [shareData] = mockShare.mock.calls[0] as [{ files: File[] }][]
    expect((shareData as unknown as { files: File[] }).files).toHaveLength(1)
    expect((shareData as unknown as { files: File[] }).files[0]).toBeInstanceOf(File)
    expect((shareData as unknown as { files: File[] }).files[0].name).toMatch(/\.vcf$/)
  })

  it('returns silently when user dismisses the share sheet (AbortError) — no second popup', async () => {
    const abortError = new DOMException('Share cancelled', 'AbortError')
    mockShare.mockRejectedValue(abortError)

    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    const shareBtns = screen.getAllByTitle('Share via iOS share sheet')
    fireEvent.click(shareBtns[0])

    await waitFor(() => expect(mockShare).toHaveBeenCalled())
    // After AbortError, should NOT navigate to data URI
    expect((window.location as { href: string }).href).toBe('')
  })

  it('falls back to data URI on non-abort share failure', async () => {
    mockShare.mockRejectedValue(new Error('Unexpected share error'))

    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    const shareBtns = screen.getAllByTitle('Share via iOS share sheet')
    fireEvent.click(shareBtns[0])

    await waitFor(() =>
      expect((window.location as { href: string }).href).toMatch(/^data:text\/x-vcard/)
    )
  })

  it('falls back to data URI when navigator.canShare returns false', async () => {
    mockCanShare.mockReturnValue(false)

    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    const shareBtns = screen.getAllByTitle('Share via iOS share sheet')
    fireEvent.click(shareBtns[0])

    await waitFor(() =>
      expect((window.location as { href: string }).href).toMatch(/^data:text\/x-vcard/)
    )
    expect(mockShare).not.toHaveBeenCalled()
  })
})

// ─── UI rendering ─────────────────────────────────────────────────────────────

describe('UI rendering', () => {
  it('shows iOS two-button layout (UserPlus + Share) on iOS', async () => {
    setUserAgent(IOS_UA)
    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    const directBtns = screen.getAllByTitle('Open in Contacts app')
    const shareBtns = screen.getAllByTitle('Share via iOS share sheet')
    // At minimum one per member row
    expect(directBtns.length).toBeGreaterThanOrEqual(mockMembers.length)
    expect(shareBtns.length).toBeGreaterThanOrEqual(mockMembers.length)
  })

  it('shows Export All option in dropdown on desktop', async () => {
    const user = userEvent.setup()
    render(<ContactExport groupId="group-1" groupName="Test Group" />)
    await waitForMembers()

    // Per-member iOS buttons should not be present on desktop
    expect(screen.queryByTitle('Open in Contacts app')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Share via iOS share sheet')).not.toBeInTheDocument()

    // Export All is in the dropdown; open it first
    await user.click(screen.getByRole('button', { name: 'Export options' }))
    expect(await screen.findByText(/Export All/)).toBeInTheDocument()
  })
})
