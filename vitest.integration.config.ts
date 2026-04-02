import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Vitest auto-loads .env.test.local from the project root in test mode
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./src/test/setup-integration.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
