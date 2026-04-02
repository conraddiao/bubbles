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
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Bubbles
          </h1>
          <p className="mt-4 text-xl leading-relaxed text-muted-foreground sm:text-2xl">
            The easiest way to swap contacts<br className="hidden sm:inline" /> at your next gathering.
          </p>
        </header>

        <div className="mb-10 space-y-4 text-center text-base text-foreground/80">
          <p>
            Weddings, park hangs, house parties, that friend-of-a-friend dinner
            where everyone clicked. <strong className="text-foreground">Bubbles</strong> lets
            the whole group share contact info in seconds.
          </p>
          <p className="text-sm text-muted-foreground">
            Flash a QR code. Everyone joins. No app downloads, no awkward
            &ldquo;what&rsquo;s your number?&rdquo; one by one.
          </p>
        </div>

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

        <footer className="mt-10 text-center">
          <p className="font-label text-xs uppercase tracking-widest text-muted-foreground">
            Made for real life, not the enterprise
          </p>
        </footer>
      </main>
    </div>
  )
}
