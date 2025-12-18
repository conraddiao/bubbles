'use client'

import Link from 'next/link'
import { ArrowRight, KeyRound, QrCode, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const { user, loading, profile } = useAuth()

  const displayName = [
    profile?.first_name ?? user?.user_metadata?.first_name,
    profile?.last_name ?? user?.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const greetingName = displayName || user?.email || 'there'
  const createGroupLink = user ? '/dashboard' : '/auth?mode=signup'
  const joinGroupLink = user ? '/join' : '/auth?mode=signin'

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-indigo-100 to-indigo-200">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-12 sm:py-16">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
            Shared Contact Groups
          </p>
          <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            Welcome back, {greetingName}!
          </h1>
          <p className="text-base text-slate-700 sm:text-lg">
            Create or join shared contact groups to keep everyone connected.
          </p>
          {!loading && !user && (
            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
              <Link href="/auth?mode=signup">
                <Button>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/auth?mode=signin">
                <Button variant="outline">Sign In</Button>
              </Link>
            </div>
          )}
        </header>

        <main className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="h-full rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <ArrowRight className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                Create Group
              </CardTitle>
              <CardDescription className="text-slate-600">
                Spin up a group to gather and share contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={createGroupLink}>
                <Button className="w-full">Create Group</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <QrCode className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                Join Group
              </CardTitle>
              <CardDescription className="text-slate-600">
                Join an existing group using a QR code or invite code.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link href={joinGroupLink} className="block">
                <Button variant="outline" className="w-full justify-center gap-2">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  Scan QR
                </Button>
              </Link>
              <Link href={joinGroupLink} className="block">
                <Button className="w-full justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Enter Code
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Share2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                My Groups
              </CardTitle>
              <CardDescription className="text-slate-600">
                Review and manage the groups you’ve created or joined.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={user ? '/dashboard' : '/auth?mode=signin'}>
                <Button variant="secondary" className="w-full">
                  View My Groups
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
