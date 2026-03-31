'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Share2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinGroupCard } from '@/components/join-group-card'
import { getUserGroups } from '@/lib/database'
import { useAuth } from '@/hooks/use-auth'

export const dynamic = 'force-dynamic'

interface DashboardGroup {
  id: string
  name: string
  is_owner: boolean
  member_count: number
  share_token: string
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const result = await getUserGroups()
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: Boolean(user),
  })
  const [showAllGroups, setShowAllGroups] = useState(false)

  const displayName = [
    profile?.first_name ?? user?.user_metadata?.first_name,
    profile?.last_name ?? user?.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const greetingName = displayName || user?.email || 'there'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-2">
        <p className="font-label text-sm font-semibold uppercase tracking-wide text-primary">
          Shared Contact Groups
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
          Welcome back, {greetingName}!
        </h1>
        <p className="text-muted-foreground">
          Jump into your groups or start a new one to keep everyone connected.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <Link href="/groups/create">
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
          <CardContent className="space-y-3">
            {groupsLoading ? (
              <div className="space-y-2">
                <div className="h-4 rounded bg-muted animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            ) : groupsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Error loading groups: {groupsError.message}
              </div>
            ) : !groups || groups.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No groups yet. Create your first group to get started.
                </p>
                <Link href="/groups/create">
                  <Button className="w-full">Create Group</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {(showAllGroups ? groups : groups.slice(0, 3)).map((group: DashboardGroup) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="block rounded-xl border border-border bg-card px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent-light)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {group.is_owner && (
                        <span className="text-xs font-medium text-primary">Owner</span>
                      )}
                    </div>
                  </Link>
                ))}
                {groups.length > 3 && !showAllGroups && (
                  <p className="text-xs text-muted-foreground">+{groups.length - 3} more groups</p>
                )}
                {groups.length > 3 && (
                  <div className="pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-primary hover:bg-accent"
                      onClick={() => setShowAllGroups((prev) => !prev)}
                    >
                      {showAllGroups ? 'Show less' : 'See all'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
