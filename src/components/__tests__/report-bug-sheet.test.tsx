import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { ReportBugSheet } from '../report-bug-sheet'
import { supabase } from '@/lib/supabase'

const fetchMock = vi.fn()
const getSessionMock = vi.mocked(supabase.auth.getSession)

beforeEach(() => {
  vi.clearAllMocks()
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  vi.stubGlobal('fetch', fetchMock)
  getSessionMock.mockResolvedValue({
    data: { session: { access_token: 'test-access-token' } },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ReportBugSheet', () => {
  it('renders the textarea, a close button and a single submit CTA', () => {
    render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Report a bug' })).toBeInTheDocument()
    expect(screen.getByLabelText('What went wrong?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Submit' })).toHaveLength(1)
  })

  it('closes when the close button is pressed', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<ReportBugSheet open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables submit until a description is entered', async () => {
    const user = userEvent.setup()
    render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    const submit = screen.getByRole('button', { name: 'Submit' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('What went wrong?'), 'QR code will not scan')
    expect(submit).toBeEnabled()
  })

  it('posts the report to the bug-report API with page context', async () => {
    const user = userEvent.setup()
    render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText('What went wrong?'), 'QR code will not scan')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/bug-report')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-access-token')
    const body = JSON.parse(init.body as string)
    expect(body.description).toBe('QR code will not scan')
    expect(body).toHaveProperty('path')
    expect(body).toHaveProperty('userAgent')
  })

  it('shows a thank you message and closes after a one second delay', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<ReportBugSheet open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('What went wrong?'), 'Broken')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    // Thank you shows on success, the sheet stays open for the delay
    expect(await screen.findByText('Thank you!')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 2000 })
  })

  it('surfaces the server error and keeps the description on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'You need to be signed in to report a bug.' }),
    })
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<ReportBugSheet open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('What went wrong?'), 'Broken')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You need to be signed in to report a bug.'
    )
    expect(screen.getByLabelText('What went wrong?')).toHaveValue('Broken')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('does not call the API when there is no session', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
    const user = userEvent.setup()
    render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText('What went wrong?'), 'Broken')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You need to be signed in to report a bug.'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('resets the form once closed', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText('What went wrong?'), 'Broken')
    rerender(<ReportBugSheet open={false} onOpenChange={vi.fn()} />)
    rerender(<ReportBugSheet open onOpenChange={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByLabelText('What went wrong?')).toHaveValue('')
    })
  })
})
