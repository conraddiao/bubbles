'use client'

import { useRouter } from 'next/navigation'
import { PhoneVerification } from '@/components/auth/phone-verification'

export const dynamic = 'force-dynamic'

export default function PhoneVerificationPage() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <PhoneVerification
          onSuccess={() => router.push('/profile/2fa-setup')}
          onCancel={() => router.push('/dashboard')}
        />
      </div>
    </div>
  )
}
