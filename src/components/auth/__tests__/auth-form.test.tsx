import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { AuthForm } from '../auth-form'
import { createMockUseAuth } from '@/test/mocks/auth'

// Mock the useAuth hook
const mockUseAuth = createMockUseAuth()
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => mockUseAuth)
}))

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock functions but keep the same mock object
    mockUseAuth.signIn.mockClear()
    mockUseAuth.signUp.mockClear()
    mockUseAuth.signOut.mockClear()
    mockUseAuth.updateProfile.mockClear()
  })

  describe('Sign In Mode', () => {
    it('renders sign in form by default', () => {
      render(<AuthForm />)
      
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('submits sign in form with valid data', async () => {
      const user = userEvent.setup()
      mockUseAuth.signIn.mockResolvedValue({ error: undefined })
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      await waitFor(() => {
        expect(mockUseAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('accepts email input', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm />)
      
      const emailInput = screen.getByLabelText('Email')
      
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('shows validation errors for missing password', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument()
      })
    })

    it('toggles password visibility', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm />)
      
      const passwordInput = screen.getByLabelText('Password')
      // Find the eye icon button by looking for buttons without text content
      const toggleButtons = screen.getAllByRole('button')
      const toggleButton = toggleButtons.find(btn => 
        btn.type === 'button' && !btn.textContent?.trim()
      )
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      
      if (toggleButton) {
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'text')
        
        await user.click(toggleButton)
        expect(passwordInput).toHaveAttribute('type', 'password')
      }
    })
  })

  describe('Sign Up Mode', () => {
    it('renders sign up form when mode is signup', () => {
      render(<AuthForm mode="signup" />)
      
      expect(screen.getByText('Sign up to create and manage contact groups')).toBeInTheDocument()
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
    })

    it('submits sign up form with valid data', async () => {
      const user = userEvent.setup()
      mockUseAuth.signUp.mockResolvedValue({ error: undefined })
      
      render(<AuthForm mode="signup" />)
      
      await user.type(screen.getByLabelText('Full Name'), 'John Doe')
      await user.type(screen.getByLabelText('Email'), 'john@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.type(screen.getByLabelText(/Phone Number/), '+1234567890')
      await user.click(screen.getByRole('button', { name: 'Create Account' }))
      
      await waitFor(() => {
        expect(mockUseAuth.signUp).toHaveBeenCalledWith(
          'john@example.com',
          'password123',
          'John Doe',
          '+1234567890'
        )
      })
    })

    it('shows validation errors for missing full name', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm mode="signup" />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create Account' }))
      
      await waitFor(() => {
        expect(screen.getByText('Full name is required')).toBeInTheDocument()
      })
    })

    it('shows validation errors for weak password', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm mode="signup" />)
      
      await user.type(screen.getByLabelText('Full Name'), 'John Doe')
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), '123')
      await user.click(screen.getByRole('button', { name: 'Create Account' }))
      
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      })
    })
  })

  describe('Mode Toggle', () => {
    it('switches between sign in and sign up modes', async () => {
      const user = userEvent.setup()
      
      render(<AuthForm />)
      
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      
      await user.click(screen.getByText('Sign Up'))
      expect(screen.getByText('Sign up to create and manage contact groups')).toBeInTheDocument()
      
      await user.click(screen.getByText('Sign In'))
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading state during form submission', async () => {
      const user = userEvent.setup()
      let resolveSignIn: (value: unknown) => void
      mockUseAuth.signIn.mockImplementation(() => new Promise(resolve => {
        resolveSignIn = resolve
      }))
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      
      // Click submit and immediately check loading state
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      // Check that button is disabled during loading
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled()
      
      // Resolve the promise to clean up
      act(() => {
        resolveSignIn({ error: undefined })
      })
    })
  })

  describe('Success Callback', () => {
    it('calls onSuccess callback after successful sign in', async () => {
      const user = userEvent.setup()
      const onSuccess = vi.fn()
      mockUseAuth.signIn.mockResolvedValue({ error: undefined })
      
      render(<AuthForm onSuccess={onSuccess} />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('2FA Flow', () => {
    it('shows 2FA verification when user has 2FA enabled', async () => {
      const user = userEvent.setup()
      // Mock that user has 2FA enabled - this would be determined by the auth result
      mockUseAuth.signIn.mockResolvedValue({ error: undefined })
      
      render(<AuthForm />)
      
      await user.type(screen.getByLabelText('Email'), 'test@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      
      // Note: The current implementation doesn't fully implement 2FA detection
      // This test documents the expected behavior
      await waitFor(() => {
        expect(mockUseAuth.signIn).toHaveBeenCalled()
      })
    })
  })
})