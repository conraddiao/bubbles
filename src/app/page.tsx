'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, MoreVertical, Share2 } from 'lucide-react'
import { User } from '@supabase/supabase-js'

import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinGroupCard } from '@/components/join-group-card'
import { useAuth } from '@/hooks/use-auth'
import { Profile } from '@/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface LandingPageProps {
  user: User | null
  profile: Profile | null
  onSignOut: () => Promise<void>
}

function LandingPage({ user, profile, onSignOut }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = [
    profile?.first_name ?? user?.user_metadata?.first_name,
    profile?.last_name ?? user?.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const greetingName = displayName || user?.email || 'there'
  const createGroupLink = user ? '/groups/create' : '/auth?mode=signup'
  const avatarInitial = displayName?.charAt(0) ?? user?.email?.charAt(0) ?? '?'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await onSignOut()
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-indigo-100 to-indigo-200">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-12 sm:py-16">
        <header className="space-y-4 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                Shared Contact Groups
              </p>
              <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                {user ? `Welcome back, ${greetingName}!` : 'Welcome to Bubbles!'}
              </h1>
            </div>
            {user ? (
              <div className="relative" ref={menuRef}>
                <Button
                  variant="outline"
                  size="icon"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-indigo-100 text-sm font-semibold text-indigo-700">
                      {avatarInitial.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Open user menu</span>
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {displayName || 'Account'}
                      </p>
                      {user?.email && <p className="text-xs text-slate-500">{user.email}</p>}
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-indigo-50"
                      onClick={handleSignOut}
                    >
                      Sign Out
                      <MoreVertical className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth?mode=signin">
                <Button variant="outline">Log In</Button>
              </Link>
            )}
          </div>
          <p className="text-base text-slate-700 sm:text-lg">
            Create or join shared contact groups to keep everyone connected.
          </p>
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

          <JoinGroupCard />

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
            <CardContent className="text-sm text-slate-700">
              {user ? (
                <p>Access your groups anytime from the dashboard navigation.</p>
              ) : (
                <p>Sign in to see the groups you&apos;ve created or joined.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

export default function Home() {
  const { user, profile, signOut, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !profile) {
      router.push('/profile/setup')
    }
  }, [loading, user, profile, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-gray-600">Redirecting to complete your profile...</p>
        </div>
      </div>
    )
  }

  if (user && profile) {
    return <DashboardContent user={user} profile={profile} onSignOut={signOut} />
  }

  return <LandingPage user={user} profile={profile} onSignOut={signOut} />
}
