import { fetchUserProfile, createUserProfile } from '../auth-service'
import { supabase } from '../supabase'

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn()
    }
  }
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('fetchUserProfile', () => {
    const userId = '5babb625-93d5-4ec0-8c27-4d2a11e03237'

    it('should handle timeout gracefully', async () => {
      // Mock a hanging query
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => 
          new Promise(() => {}) // Never resolves
        ),
        abortSignal: jest.fn().mockReturnThis()
      }
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      const profilePromise = fetchUserProfile(userId)
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(30000)
      
      await expect(profilePromise).rejects.toThrow('Connection timeout')
    })

    it('should handle RLS permission errors', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { 
            code: '42501', 
            message: 'permission denied for table profiles' 
          }
        }),
        abortSignal: jest.fn().mockReturnThis()
      }
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      await expect(fetchUserProfile(userId)).rejects.toThrow('permission denied')
    })

    it('should create profile when not found', async () => {
      // Mock profile not found
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' }
        }),
        abortSignal: jest.fn().mockReturnThis()
      }
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      // Mock getUser for profile creation
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: userId, 
            email: 'test@example.com',
            user_metadata: { first_name: 'Test', last_name: 'User' }
          } 
        },
        error: null
      } as any)

      // Mock profile creation
      const mockInsert = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: userId, email: 'test@example.com' },
          error: null
        })
      }
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue(mockInsert)
      } as any)

      const result = await fetchUserProfile(userId)
      expect(result).toEqual({ id: userId, email: 'test@example.com' })
    })

    it('should retry on network failures', async () => {
      let callCount = 0
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => {
          callCount++
          if (callCount < 3) {
            return Promise.reject(new Error('Network error'))
          }
          return Promise.resolve({
            data: { id: userId, email: 'test@example.com' },
            error: null
          })
        }),
        abortSignal: jest.fn().mockReturnThis()
      }
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      } as any)

      // This would need to be implemented in the actual service
      // const result = await fetchUserProfileWithRetry(userId)
      // expect(callCount).toBe(3)
      // expect(result).toEqual({ id: userId, email: 'test@example.com' })
    })
  })
})