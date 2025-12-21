import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { ContactForm } from '../contact-form'
import * as database from '@/lib/database'
import { createMockUseAuth } from '@/test/mocks/auth'

// Mock the database functions
vi.mock('@/lib/database', () => ({
  getGroupByToken: vi.fn(),
  joinContactGroup: vi.fn(),
  joinContactGroupAnonymous: vi.fn(),
  getUserProfile: vi.fn(),
}))

// Mock the useAuth hook
const mockUseAuth = createMockUseAuth()
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(() => mockUseAuth)
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockGetGroupByToken = vi.mocked(database.getGroupByToken)
const mockJoinContactGroup = vi.mocked(database.joinContactGroup)
const mockJoinContactGroupAnonymous = vi.mocked(database.joinContactGroupAnonymous)
const mockGetUserProfile = vi.mocked(database.getUserProfile)

describe('ContactForm', () => {
  const mockShareToken = 'test-share-token'
  const mockOnSuccess = vi.fn()

  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    description: 'Test group description',
    is_closed: false,
    access_type: 'open' as const,
    join_password_hash: null,
    share_token: 'token',
    owner: {
      id: 'owner-1',
      first_name: 'Group',
      last_name: 'Owner'
    }
  }

  const mockProfile = {
    id: 'user-1',
    email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone: '+1234567890',
    phone_verified: true,
    two_factor_enabled: false,
    sms_notifications_enabled: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.user = null
    mockUseAuth.loading = false
    
    // Set up default successful responses
    mockGetGroupByToken.mockResolvedValue({ data: mockGroup, error: null })
    mockGetUserProfile.mockResolvedValue({ data: null, error: null })
  })

  describe('Error States', () => {
    it('shows error when group is not found', async () => {
      mockGetGroupByToken.mockResolvedValue({ data: null, error: 'Group not found' })
      
      render(<ContactForm shareToken={mockShareToken} />)
      
      await waitFor(() => {
        expect(screen.getByText('Group Not Found')).toBeInTheDocument()
        expect(screen.getByText('This group link is invalid or the group may have been closed.')).toBeInTheDocument()
      })
    })

    it('shows closed group message when group is closed', async () => {
      const closedGroup = { ...mockGroup, is_closed: true }
      mockGetGroupByToken.mockResolvedValue({ data: closedGroup, error: null })
      
      render(<ContactForm shareToken={mockShareToken} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
        expect(screen.getByText('Closed')).toBeInTheDocument()
        expect(screen.getByText('This group is no longer accepting new members.')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(<ContactForm shareToken={mockShareToken} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
      
      const firstNameInput = screen.getByLabelText('First Name *')
      const lastNameInput = screen.getByLabelText('Last Name *')
      const emailInput = screen.getByLabelText('Email Address *')
      
      // Type and then clear to trigger validation
      await user.type(firstNameInput, 'test')
      await user.clear(firstNameInput)
      await user.type(lastNameInput, 'test')
      await user.clear(lastNameInput)
      await user.type(emailInput, 'test')
      await user.clear(emailInput)
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument()
        expect(screen.getByText('Last name is required')).toBeInTheDocument()
        expect(screen.getByText('Invalid email address')).toBeInTheDocument()
      })
    })

    it('validates phone number format when provided', async () => {
      const user = userEvent.setup()
      render(<ContactForm shareToken={mockShareToken} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
      
      const phoneInput = screen.getByLabelText('Phone Number (Optional)')
      
      // Type invalid phone number
      await user.type(phoneInput, 'invalid-phone')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByText('Invalid phone number format')).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('successfully submits form for anonymous user', async () => {
      const user = userEvent.setup()
      mockJoinContactGroupAnonymous.mockResolvedValue({ data: 'success', error: null })
      
      render(<ContactForm shareToken={mockShareToken} onSuccess={mockOnSuccess} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
      
      await user.type(screen.getByLabelText('First Name *'), 'John')
      await user.type(screen.getByLabelText('Last Name *'), 'Doe')
      await user.type(screen.getByLabelText('Email Address *'), 'john@example.com')
      await user.type(screen.getByLabelText('Phone Number (Optional)'), '+1234567890')
      await user.click(screen.getByRole('button', { name: 'Join Group' }))
      
      await waitFor(() => {
        expect(mockJoinContactGroupAnonymous).toHaveBeenCalledWith(
          mockShareToken,
          'John',
          'Doe',
          'john@example.com',
          '+1234567890',
          false, // Default value when checkbox is not checked
          undefined
        )
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles submission errors gracefully', async () => {
      const user = userEvent.setup()
      mockJoinContactGroupAnonymous.mockResolvedValue({ 
        data: null, 
        error: 'Failed to join group' 
      })
      
      render(<ContactForm shareToken={mockShareToken} />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
      
      await user.type(screen.getByLabelText('First Name *'), 'John')
      await user.type(screen.getByLabelText('Last Name *'), 'Doe')
      await user.type(screen.getByLabelText('Email Address *'), 'john@example.com')
      await user.click(screen.getByRole('button', { name: 'Join Group' }))
      
      await waitFor(() => {
        expect(mockJoinContactGroupAnonymous).toHaveBeenCalled()
      })
      
      // Should not call onSuccess on error
      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })
})
