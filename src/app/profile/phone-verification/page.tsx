'use client'

import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PhoneVerification } from '@/components/auth/phone-verification'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PhoneVerificationPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <PhoneVerification 
            onSuccess={() => router.push('/profile/2fa-setup')}
            onCancel={() => router.push('/')}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
