'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinGroupCard } from '@/components/join-group-card'
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
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-12 sm:py-16">
        <header className="space-y-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="font-label text-sm font-semibold uppercase tracking-wide text-primary">
                Shared Contact Groups
              </p>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                Welcome to Bubbles!
              </h1>
            </div>
            <Link href="/auth?mode=signin">
              <Button variant="outline">Log In</Button>
            </Link>
          </div>
          <p className="text-muted-foreground sm:text-lg">
            Create or join shared contact groups to keep everyone connected.
          </p>
        </header>

        <main className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ArrowRight className="h-5 w-5 text-primary" aria-hidden="true" />
                Create Group
              </CardTitle>
              <CardDescription>
                Spin up a group to gather and share contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth?mode=signup">
                <Button className="w-full">Create Group</Button>
              </Link>
            </CardContent>
          </Card>

          <JoinGroupCard />

          <Card className="h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Share2 className="h-5 w-5 text-primary" aria-hidden="true" />
                My Groups
              </CardTitle>
              <CardDescription>
                Review and manage the groups you&apos;ve created or joined.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Sign in to see the groups you&apos;ve created or joined.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
