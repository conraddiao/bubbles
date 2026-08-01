import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { ReportBugSheet } from '../report-bug-sheet'

const assignMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...window.location, href: 'https://bubbles.fyi/dashboard', assign: assignMock },
  })
})

describe('ReportBugSheet', () => {
  it('renders the textarea and a single submit CTA when open', () => {
    render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Report a bug' })).toBeInTheDocument()
    expect(screen.getByLabelText('What went wrong?')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Submit' })).toHaveLength(1)
  })

  it('disables submit until a description is entered', async () => {
    const user = userEvent.setup()
    render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    const submit = screen.getByRole('button', { name: 'Submit' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('What went wrong?'), 'QR code will not scan')
    expect(submit).toBeEnabled()
  })

  it('opens a mailto to Conrad@bubbles.fyi with the description', async () => {
    const user = userEvent.setup()
    render(<ReportBugSheet open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText('What went wrong?'), 'QR code will not scan')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(assignMock).toHaveBeenCalledTimes(1)
    const url = assignMock.mock.calls[0][0] as string
    expect(url.startsWith('mailto:Conrad@bubbles.fyi?')).toBe(true)
    expect(url).toContain(encodeURIComponent('Bubbles bug report'))
    expect(url).toContain(encodeURIComponent('QR code will not scan'))
  })

  it('shows a thank you message and closes after a one second delay', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<ReportBugSheet open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('What went wrong?'), 'Broken')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    // Thank you shows immediately, the sheet stays open for the delay
    expect(screen.getByText('Thank you!')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 2000 })
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
