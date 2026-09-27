import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { PrintSheet } from '../print-sheet'

const props = {
  groupName: "Maya & Dev's Wedding",
  joinUrl: 'https://bubbles.fyi/group/abc123/join',
  displayUrl: 'bubbles.fyi/group/abc123/join',
  backHref: '/group/abc123',
}

describe('PrintSheet', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the group name, the join QR and the typed fallback URL', () => {
    render(<PrintSheet {...props} />)

    expect(screen.getByText("Maya & Dev's Wedding")).toBeInTheDocument()
    expect(screen.getByText('Scan to join')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /QR code to join Maya & Dev's Wedding/i })
    ).toBeInTheDocument()
    // Guests who can't scan can still type the URL
    expect(screen.getByText('bubbles.fyi/group/abc123/join')).toBeInTheDocument()
  })

  it('invokes the browser print dialog', async () => {
    const printSpy = vi.fn()
    vi.stubGlobal('print', printSpy)

    render(<PrintSheet {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /print this sheet/i }))

    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('marks screen-only chrome as no-print so it drops off the paper', () => {
    const { container } = render(<PrintSheet {...props} />)

    const printButton = screen.getByRole('button', { name: /print this sheet/i })
    expect(printButton.closest('.no-print')).not.toBeNull()

    const backLink = screen.getByRole('link', { name: /back to group/i })
    expect(backLink).toHaveAttribute('href', '/group/abc123')
    expect(backLink.closest('.no-print')).not.toBeNull()

    // The sheet itself is never hidden from print
    expect(container.querySelector('.print-sheet')).not.toBeNull()
    expect(container.querySelector('.print-sheet.no-print')).toBeNull()
  })

  it('falls back to a placeholder when the join URL is not resolved yet', () => {
    render(<PrintSheet {...props} joinUrl="" displayUrl="" />)

    expect(screen.queryByRole('img', { name: /QR code/i })).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
