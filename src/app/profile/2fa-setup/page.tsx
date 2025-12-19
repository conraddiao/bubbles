'use client'

import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function TwoFactorSetupPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Security Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your two-factor authentication settings
            </p>
          </div>
          
          <TwoFactorSetup onSuccess={() => router.push('/')} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
