import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { OTPVerifyForm } from '../otp-verify-form'

const mockVerifyOtp = vi.fn()
const mockSendOtp = vi.fn()

vi.mock('@/hooks/use-phone-auth', () => ({
  usePhoneAuth: () => ({
    verifyOtp: mockVerifyOtp,
    sendOtp: mockSendOtp,
    isLoading: false,
    resendCooldown: 0,
  }),
}))

// input-otp schedules setTimeout(0/10/50) on focus/selection to sync the caret.
// Fake timers keep every one of them under our control so none fire after the
// jsdom environment tears down ("window is not defined"). We unmount and flush
// pending timers before restoring real timers.
describe('OTPVerifyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    cleanup()
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  it('wires up native SMS autofill on the code input', () => {
    render(
      <OTPVerifyForm phone="+15555550100" onVerified={vi.fn()} onChangeNumber={vi.fn()} />
    )

    // input-otp renders a single hidden input that drives the slots
    const input = document.querySelector('input')
    expect(input).not.toBeNull()
    expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    expect(input).toHaveAttribute('inputmode', 'numeric')
  })

  it('calls onVerified when the code is correct', async () => {
    const user = setupUser()
    mockVerifyOtp.mockResolvedValue({})
    const onVerified = vi.fn()

    render(
      <OTPVerifyForm phone="+15555550100" onVerified={onVerified} onChangeNumber={vi.fn()} />
    )

    await user.keyboard('123456')

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith('+15555550100', '123456')
      expect(onVerified).toHaveBeenCalled()
    })
  })

  it('clears the entry and flags the field invalid on a failed verify', async () => {
    const user = setupUser()
    mockVerifyOtp.mockResolvedValue({
      error: 'That code is incorrect or has expired. Request a new code and try again.',
    })
    const onVerified = vi.fn()

    render(
      <OTPVerifyForm phone="+15555550100" onVerified={onVerified} onChangeNumber={vi.fn()} />
    )

    await user.keyboard('000000')

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith('+15555550100', '000000')
    })

    // onVerified is NOT called, an inline error is shown, and the boxes are cleared
    expect(onVerified).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect or expired/i)
    const input = document.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('')
  })
})
