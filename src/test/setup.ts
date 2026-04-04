import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}))

// Mock Twilio/SMS functionality
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

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock ResizeObserver for shadcn/ui components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia (used by SquircleBackground for prefers-reduced-motion)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock Three.js and qrcode (WebGL not available in jsdom)
vi.mock('three', () => ({
  PerspectiveCamera: vi.fn().mockImplementation(() => ({ position: { z: 0 }, aspect: 1, updateProjectionMatrix: vi.fn() })),
  Scene: vi.fn().mockImplementation(() => ({ add: vi.fn() })),
  SphereGeometry: vi.fn().mockImplementation(() => ({ attributes: { position: { count: 0, getX: vi.fn(() => 0), getY: vi.fn(() => 0), getZ: vi.fn(() => 0), setXYZ: vi.fn(), needsUpdate: false } }, computeVertexNormals: vi.fn(), dispose: vi.fn() })),
  ShaderMaterial: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
  Mesh: vi.fn().mockImplementation(() => ({ rotation: { x: 0, y: 0, z: 0 } })),
  WebGLRenderer: vi.fn().mockImplementation(() => ({ setClearColor: vi.fn(), setPixelRatio: vi.fn(), setSize: vi.fn(), setAnimationLoop: vi.fn(), render: vi.fn(), dispose: vi.fn() })),
  DoubleSide: 2,
  CanvasTexture: vi.fn().mockImplementation(() => ({ dispose: vi.fn() })),
}))

vi.mock('qrcode', () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
  toCanvas: vi.fn().mockResolvedValue(undefined),
}))