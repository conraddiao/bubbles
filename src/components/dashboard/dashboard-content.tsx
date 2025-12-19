'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, KeyRound, MoreVertical, QrCode, Share2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getUserGroups } from '@/lib/database'
import { Profile } from '@/types'

interface DashboardGroup {
  id: string
  name: string
  is_owner: boolean
  member_count: number
  share_token: string
}

interface DashboardContentProps {
  user: User
  profile: Profile
  onSignOut: () => Promise<void>
}

export function DashboardContent({ user, profile, onSignOut }: DashboardContentProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const result = await getUserGroups()
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: Boolean(user),
  })

  const displayName = [
    profile?.first_name ?? user?.user_metadata?.first_name,
    profile?.last_name ?? user?.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const greetingName = displayName || user?.email || 'there'
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
        <header className="space-y-3 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                Shared Contact Groups
              </p>
              <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                Welcome back, {greetingName}!
              </h1>
              <p className="text-base text-slate-700 sm:text-lg">
                Jump into your groups or start a new one to keep everyone connected.
              </p>
            </div>
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
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {displayName || 'Account'}
                    </p>
                    {user?.email && <p className="text-xs text-slate-500">{user.email}</p>}
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-indigo-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
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
          </div>
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
              <Link href="/groups/create">
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
              <Link href="/join" className="block">
                <Button variant="outline" className="w-full justify-center gap-2">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  Scan QR
                </Button>
              </Link>
              <Link href="/join" className="block">
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
            <CardContent className="space-y-3">
              {groupsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
                </div>
              ) : groupsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Error loading groups: {groupsError.message}
                </div>
              ) : !groups || groups.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    No groups yet. Create your first group to get started.
                  </p>
                  <Link href="/groups/create">
                    <Button className="w-full">Create Group</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.slice(0, 3).map((group: DashboardGroup) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="block rounded-xl border border-slate-200 bg-white/70 px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {group.name}
                          </p>
                          <p className="text-xs text-slate-600">
                            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {group.is_owner && (
                          <span className="text-xs font-medium text-indigo-700">Owner</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {groups.length > 3 && (
                    <p className="text-xs text-slate-600">+{groups.length - 3} more groups</p>
                  )}
                  <Link href="/">
                    <Button variant="secondary" className="w-full">
                      View Dashboard
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
