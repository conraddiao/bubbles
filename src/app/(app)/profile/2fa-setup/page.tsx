'use client'

import { useRouter } from 'next/navigation'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'

export const dynamic = 'force-dynamic'

export default function TwoFactorSetupPage() {
  const router = useRouter()

  return (
    <div className="flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold mb-2">
            Security Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your two-factor authentication settings
          </p>
        </div>

        <TwoFactorSetup onSuccess={() => router.push('/dashboard')} />
      </div>
    </div>
  )
}
