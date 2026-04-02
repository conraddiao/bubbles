import { vi } from 'vitest'

// Integration tests use the real Supabase client — do NOT mock it here.
// Configure .env.test.local with your local Supabase credentials before running.

// Mock Twilio to avoid sending real SMS during tests
vi.mock('@/lib/twilio', () => ({
  sendSMS: vi.fn(),
  sendVerificationCode: vi.fn(),
  verifyCode: vi.fn(),
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))
