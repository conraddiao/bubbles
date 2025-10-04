import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { TwoFactorSetup } from '../two-factor-setup'
import { createMockUseAuth } from '@/test/mocks/auth'

// Mock the useAuth hook with proper state management
const createMockAuthWithState = (initialState = {}) => {
  const baseState = createMockUseAuth(initialState)
  
  // Create a stateful updateProfile mock
  baseState.updateProfile = vi.fn().mockImplementation(async (updates) => {
    if (baseState.profile) {
      Object.assign(baseState.profile, updates)
    }
    return { error: undefined }
  })
  
  return baseState
}

let mockUseAuth = createMockAuthWithState()
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => mockUseAuth)
}))

describe('TwoFactorSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth = createMockAuthWithState()
  })

  describe('Initial State', () => {
    it('renders 2FA setup interface', () => {
      render(<TwoFactorSetup />)
      
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
      expect(screen.getByText('Add an extra layer of security to your account with SMS-based 2FA')).toBeInTheDocument()
      expect(screen.getByText('SMS Two-Factor Authentication')).toBeInTheDocument()
    })

    it('shows disabled state when 2FA is off', () => {
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, two_factor_enabled: false }
      })
      
      render(<TwoFactorSetup />)
      
      expect(screen.getByText('Disabled - Enable 2FA for enhanced security')).toBeInTheDocument()
      expect(screen.getByRole('switch')).not.toBeChecked()
    })

    it('shows enabled state when 2FA is on', () => {
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, two_factor_enabled: true }
      })
      
      render(<TwoFactorSetup />)
      
      expect(screen.getByText('Enabled - Your account is protected with 2FA')).toBeInTheDocument()
      expect(screen.getByRole('switch')).toBeChecked()
      expect(screen.getByText('2FA is Active')).toBeInTheDocument()
    })
  })

  describe('Phone Verification Requirement', () => {
    it('shows warning when phone is not verified', () => {
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, phone_verified: false }
      })
      
      render(<TwoFactorSetup />)
      
      expect(screen.getByText(/You need to verify your phone number/)).toBeInTheDocument()
      expect(screen.getByText('Verify phone number')).toBeInTheDocument()
    })

    it('disables 2FA toggle when phone is not verified', () => {
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, phone_verified: false }
      })
      
      render(<TwoFactorSetup />)
      
      const toggle = screen.getByRole('switch')
      expect(toggle).toBeDisabled()
    })
  })

  describe('Enabling 2FA', () => {
    it('shows verification step when enabling 2FA', async () => {
      const user = userEvent.setup()
      
      render(<TwoFactorSetup />)
      
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
        expect(screen.getByText('Enter the verification code sent to your phone')).toBeInTheDocument()
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })
    })

    it('shows phone number in verification step', async () => {
      const user = userEvent.setup()
      
      render(<TwoFactorSetup />)
      
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByText(`Code sent to ${mockUseAuth.profile?.phone}`)).toBeInTheDocument()
      })
    })

    it('shows verification form when enabling 2FA', async () => {
      const user = userEvent.setup()
      
      render(<TwoFactorSetup />)
      
      // Enable 2FA
      await user.click(screen.getByRole('switch'))
      
      // Should show verification form
      await waitFor(() => {
        expect(screen.getByText('Enable 2FA')).toBeInTheDocument()
        expect(screen.getByText('Enter the verification code sent to your phone')).toBeInTheDocument()
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeInTheDocument()
      })
    })

    it('processes verification code submission', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      
      render(<TwoFactorSetup onSuccess={onSuccess} />)
      
      // Enable 2FA to show verification form
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })
      
      // Enter verification code and submit
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Enable 2FA' }))
      
      // Should call updateProfile (the component handles this)
      await waitFor(() => {
        expect(mockUseAuth.updateProfile).toHaveBeenCalledWith({
          two_factor_enabled: true,
        })
      })
    })

    it('validates verification code format', async () => {
      const user = userEvent.setup()
      
      render(<TwoFactorSetup />)
      
      // Enable 2FA
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })
      
      // Enter invalid code (less than 6 digits)
      const codeInput = screen.getByLabelText('Verification Code')
      await user.type(codeInput, '123')
      await user.click(screen.getByRole('button', { name: 'Enable 2FA' }))
      
      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByText('Verification code must be 6 digits')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('allows canceling 2FA setup', async () => {
      const user = userEvent.setup()
      
      render(<TwoFactorSetup />)
      
      // Enable 2FA
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })
      
      // Cancel setup
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      
      // Should return to main setup screen
      expect(screen.getByText('SMS Two-Factor Authentication')).toBeInTheDocument()
      expect(screen.queryByLabelText('Verification Code')).not.toBeInTheDocument()
    })

    it('allows resending verification code', async () => {
      const user = userEvent.setup()
      
      render(<TwoFactorSetup />)
      
      // Enable 2FA
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })
      
      // Click resend code button
      const resendButton = screen.getByRole('button', { name: 'Resend Code' })
      await user.click(resendButton)
      
      // The button should still be there (component handles the resend internally)
      expect(resendButton).toBeInTheDocument()
    })
  })

  describe('Disabling 2FA', () => {
    it('disables 2FA directly when toggled off', async () => {
      const user = userEvent.setup()
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, two_factor_enabled: true }
      })
      
      render(<TwoFactorSetup />)
      
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(mockUseAuth.updateProfile).toHaveBeenCalledWith({
          two_factor_enabled: false,
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('handles error when enabling 2FA fails', async () => {
      const user = userEvent.setup()
      mockUseAuth.updateProfile.mockResolvedValue({ error: 'Failed to enable 2FA' })
      
      render(<TwoFactorSetup />)
      
      // Enable 2FA
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })
      
      // Enter verification code
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Enable 2FA' }))
      
      // Should call updateProfile
      await waitFor(() => {
        expect(mockUseAuth.updateProfile).toHaveBeenCalled()
      })
    })

    it('handles error when disabling 2FA fails', async () => {
      const user = userEvent.setup()
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, two_factor_enabled: true }
      })
      mockUseAuth.updateProfile.mockResolvedValue({ error: 'Failed to disable 2FA' })
      
      render(<TwoFactorSetup />)
      
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(mockUseAuth.updateProfile).toHaveBeenCalled()
      })
    })
  })

  describe('Information Display', () => {
    it('shows how 2FA works', () => {
      render(<TwoFactorSetup />)
      
      expect(screen.getByText('How it works:')).toBeInTheDocument()
      expect(screen.getByText(/When you sign in, you'll enter your email and password/)).toBeInTheDocument()
      expect(screen.getByText(/We'll send a 6-digit verification code/)).toBeInTheDocument()
      expect(screen.getByText(/Enter the code to complete your sign-in/)).toBeInTheDocument()
    })

    it('shows active 2FA status when enabled', () => {
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, two_factor_enabled: true }
      })
      
      render(<TwoFactorSetup />)
      
      expect(screen.getByText('2FA is Active')).toBeInTheDocument()
      expect(screen.getByText(/Your account is protected with two-factor authentication/)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading state during 2FA operations', async () => {
      const user = userEvent.setup()
      mockUseAuth.updateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<TwoFactorSetup />)
      
      // Enable 2FA
      await user.click(screen.getByRole('switch'))
      
      await waitFor(() => {
        expect(screen.getByLabelText('Verification Code')).toBeInTheDocument()
      })
      
      // Enter verification code
      await user.type(screen.getByLabelText('Verification Code'), '123456')
      await user.click(screen.getByRole('button', { name: 'Enable 2FA' }))
      
      // Should show loading state
      expect(screen.getByRole('button', { name: 'Enable 2FA' })).toBeDisabled()
    })
  })
})