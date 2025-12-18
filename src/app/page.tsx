'use client'

import Link from 'next/link'
import { ArrowRight, KeyRound, QrCode, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const featuredGroups = [
  { name: 'Work Holiday Party', members: 44 },
  { name: 'Pizza Extravaganza', members: 19 },
  { name: 'Ed & Theresa’s Wedding', members: 235 },
]

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
  const dashboardLink = user ? '/dashboard' : '/auth?mode=signin'

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-indigo-100 to-indigo-200">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <div className="overflow-hidden rounded-[32px] bg-white/70 shadow-2xl ring-1 ring-white/50 backdrop-blur">
          <div className="grid gap-10 bg-gradient-to-br from-indigo-50 to-indigo-100 px-6 py-8 sm:px-10 sm:py-12 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                Shared Contact Groups
              </p>
              <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                Welcome back, {greetingName}!
              </h1>
              <p className="text-base text-slate-600 sm:text-lg">
                Spin up groups for your events, invite people quickly, and keep everyone’s contact info in one place.
              </p>
              {!loading && !user && (
                <div className="flex flex-wrap gap-3 pt-2">
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
            </div>
            <Card className="rounded-2xl border-0 bg-white/90 shadow-lg ring-1 ring-indigo-100">
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl text-slate-900">Quick Actions</CardTitle>
                <CardDescription className="text-slate-600">
                  Move faster with the most common ways to start or join a group.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-2xl bg-indigo-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-slate-900">New Group</p>
                      <p className="text-sm text-slate-600">
                        Create a group to gather and share contact information.
                      </p>
                    </div>
                    <div className="rounded-full bg-indigo-100 p-2 text-indigo-700">
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                  <Link href={createGroupLink}>
                    <Button className="mt-2 w-full">Create Group</Button>
                  </Link>
                </div>

                <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-slate-900">Join Group</p>
                    <p className="text-sm text-slate-600">
                      Join an existing group to share and download contacts.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 bg-white px-6 py-8 sm:px-10 sm:py-12">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">My Groups</h2>
                <p className="text-sm text-slate-600">
                  Set up contact groups for your events with shareable forms.
                </p>
              </div>
              <Link href={dashboardLink}>
                <Button variant="ghost" className="gap-2 text-indigo-700 hover:bg-indigo-50">
                  View Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-3">
              {featuredGroups.map((group) => (
                <div
                  key={group.name}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{group.name}</p>
                    <p className="text-sm text-slate-600">{group.members} members</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                    <Share2 className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Share {group.name}</span>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
