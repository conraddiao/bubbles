'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export const dynamic = 'force-dynamic'

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      if (profile) {
        router.push('/dashboard')
      } else {
        router.push('/profile/setup')
      }
    }
  }, [loading, user, profile, router])

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Bubbles
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Create or join shared contact groups to keep everyone connected.
          </p>
        </header>

        <div className="space-y-3">
          <Link href="/auth?mode=signup" className="block">
            <Button className="w-full" size="lg">
              Get Started
            </Button>
          </Link>
          <Link href="/auth?mode=signin" className="block">
            <Button variant="outline" className="w-full" size="lg">
              Log In
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Flash a QR code at your next gathering. Everyone joins, everyone shares contacts.
        </p>
      </div>
    </div>
  )
}
