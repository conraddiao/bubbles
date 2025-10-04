import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/test/utils'
import { GroupCreationForm } from '../group-creation-form'
import * as database from '@/lib/database'

// Mock the database functions
vi.mock('@/lib/database', () => ({
  createContactGroup: vi.fn(),
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockCreateContactGroup = vi.mocked(database.createContactGroup)

describe('GroupCreationForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form with all required fields', () => {
    render(<GroupCreationForm />)
    
    expect(screen.getByText('Create Contact Group')).toBeInTheDocument()
    expect(screen.getByText('Create a new group to collect and share contact information with participants.')).toBeInTheDocument()
    expect(screen.getByLabelText('Group Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Group' })).toBeInTheDocument()
  })

  it('shows validation error for empty group name', async () => {
    const user = userEvent.setup()
    render(<GroupCreationForm />)
    
    const submitButton = screen.getByRole('button', { name: 'Create Group' })
    const nameInput = screen.getByLabelText('Group Name *')
    
    // Type something and then clear it to trigger validation
    await user.type(nameInput, 'test')
    await user.clear(nameInput)
    await user.tab() // Move focus away to trigger validation
    
    await waitFor(() => {
      expect(screen.getByText('Group name is required')).toBeInTheDocument()
    })
    
    // Submit button should be disabled when form is invalid
    expect(submitButton).toBeDisabled()
  })

  it('shows validation error for group name that is too long', async () => {
    const user = userEvent.setup()
    render(<GroupCreationForm />)
    
    const nameInput = screen.getByLabelText('Group Name *')
    const longName = 'a'.repeat(101) // Exceeds 100 character limit
    
    await user.type(nameInput, longName)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('Name too long')).toBeInTheDocument()
    })
  })

  it('shows validation error for description that is too long', async () => {
    const user = userEvent.setup()
    render(<GroupCreationForm />)
    
    const descriptionInput = screen.getByLabelText('Description (Optional)')
    const longDescription = 'a'.repeat(501) // Exceeds 500 character limit
    
    await user.type(descriptionInput, longDescription)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('Description too long')).toBeInTheDocument()
    })
  })

  it('successfully creates group with valid data', async () => {
    const user = userEvent.setup()
    const mockGroupData = {
      group_id: 'test-group-id',
      share_token: 'test-share-token'
    }
    
    mockCreateContactGroup.mockResolvedValue({
      data: mockGroupData,
      error: null
    })
    
    render(<GroupCreationForm onSuccess={mockOnSuccess} />)
    
    await user.type(screen.getByLabelText('Group Name *'), 'Test Group')
    await user.type(screen.getByLabelText('Description (Optional)'), 'Test description')
    await user.click(screen.getByRole('button', { name: 'Create Group' }))
    
    await waitFor(() => {
      expect(mockCreateContactGroup).toHaveBeenCalledWith('Test Group', 'Test description')
      expect(mockOnSuccess).toHaveBeenCalledWith('test-group-id', 'test-share-token')
    })
  })

  it('successfully creates group with only name (no description)', async () => {
    const user = userEvent.setup()
    const mockGroupData = {
      group_id: 'test-group-id',
      share_token: 'test-share-token'
    }
    
    mockCreateContactGroup.mockResolvedValue({
      data: mockGroupData,
      error: null
    })
    
    render(<GroupCreationForm onSuccess={mockOnSuccess} />)
    
    await user.type(screen.getByLabelText('Group Name *'), 'Test Group')
    await user.click(screen.getByRole('button', { name: 'Create Group' }))
    
    await waitFor(() => {
      expect(mockCreateContactGroup).toHaveBeenCalledWith('Test Group', '')
      expect(mockOnSuccess).toHaveBeenCalledWith('test-group-id', 'test-share-token')
    })
  })

  it('handles creation error gracefully', async () => {
    const user = userEvent.setup()
    
    mockCreateContactGroup.mockResolvedValue({
      data: null,
      error: 'Failed to create group'
    })
    
    render(<GroupCreationForm />)
    
    await user.type(screen.getByLabelText('Group Name *'), 'Test Group')
    await user.click(screen.getByRole('button', { name: 'Create Group' }))
    
    await waitFor(() => {
      expect(mockCreateContactGroup).toHaveBeenCalledWith('Test Group', '')
    })
    
    // Should not call onSuccess on error
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    let resolveCreate: (value: any) => void
    
    mockCreateContactGroup.mockImplementation(() => new Promise(resolve => {
      resolveCreate = resolve
    }))
    
    render(<GroupCreationForm />)
    
    await user.type(screen.getByLabelText('Group Name *'), 'Test Group')
    await user.click(screen.getByRole('button', { name: 'Create Group' }))
    
    // Check loading state
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
    
    // Resolve the promise
    resolveCreate!({
      data: { group_id: 'test-id', share_token: 'test-token' },
      error: null
    })
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Group' })).toBeInTheDocument()
    })
  })

  it('renders cancel button when onCancel prop is provided', () => {
    render(<GroupCreationForm onCancel={mockOnCancel} />)
    
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<GroupCreationForm onCancel={mockOnCancel} />)
    
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('disables cancel button during submission', async () => {
    const user = userEvent.setup()
    let resolveCreate: (value: any) => void
    
    mockCreateContactGroup.mockImplementation(() => new Promise(resolve => {
      resolveCreate = resolve
    }))
    
    render(<GroupCreationForm onCancel={mockOnCancel} />)
    
    await user.type(screen.getByLabelText('Group Name *'), 'Test Group')
    await user.click(screen.getByRole('button', { name: 'Create Group' }))
    
    // Cancel button should be disabled during submission
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    
    // Resolve the promise
    resolveCreate!({
      data: { group_id: 'test-id', share_token: 'test-token' },
      error: null
    })
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    
    mockCreateContactGroup.mockResolvedValue({
      data: { group_id: 'test-id', share_token: 'test-token' },
      error: null
    })
    
    render(<GroupCreationForm />)
    
    const nameInput = screen.getByLabelText('Group Name *')
    const descriptionInput = screen.getByLabelText('Description (Optional)')
    
    await user.type(nameInput, 'Test Group')
    await user.type(descriptionInput, 'Test description')
    await user.click(screen.getByRole('button', { name: 'Create Group' }))
    
    await waitFor(() => {
      expect(nameInput).toHaveValue('')
      expect(descriptionInput).toHaveValue('')
    })
  })

  it('validates form in real-time (onChange mode)', async () => {
    const user = userEvent.setup()
    render(<GroupCreationForm />)
    
    const nameInput = screen.getByLabelText('Group Name *')
    const submitButton = screen.getByRole('button', { name: 'Create Group' })
    
    // Initially disabled
    expect(submitButton).toBeDisabled()
    
    // Type valid name
    await user.type(nameInput, 'Valid Group Name')
    
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled()
    })
    
    // Clear the name
    await user.clear(nameInput)
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('handles network errors during submission', async () => {
    const user = userEvent.setup()
    
    mockCreateContactGroup.mockRejectedValue(new Error('Network error'))
    
    render(<GroupCreationForm />)
    
    await user.type(screen.getByLabelText('Group Name *'), 'Test Group')
    await user.click(screen.getByRole('button', { name: 'Create Group' }))
    
    await waitFor(() => {
      expect(mockCreateContactGroup).toHaveBeenCalled()
    })
    
    // Should not call onSuccess on network error
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })
})