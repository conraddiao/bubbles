import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { AuthForm } from '../auth-form'
import { createMockUseAuth } from '@/test/mocks/auth'

// Mock the useAuth hook
const mockUseAuth = createMockUseAuth()
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => mockUseAuth)
}))

describe('AuthForm Basic Tests', () => {
  it('renders sign in form', () => {
    render(<AuthForm />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('renders sign up form', () => {
    render(<AuthForm mode="signup" />)
    
    expect(screen.getByText('Sign up to create and manage contact groups')).toBeInTheDocument()
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })
})