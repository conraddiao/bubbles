'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { getUserGroups, getArchivedGroups, createContactGroup } from '@/lib/database'
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
  const router = useRouter()
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const groupName = profile?.first_name ? `${profile.first_name}'s Group` : 'New Group'
      const result = await createContactGroup(groupName)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      if (data?.group_id) {
        router.push(`/groups/${data.group_id}?created=true`)
      }
    },
  })
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const result = await getUserGroups()
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: Boolean(user),
  })

  const [showArchived, setShowArchived] = useState(false)

  const { data: archivedGroups } = useQuery({
    queryKey: ['archived-groups'],
    queryFn: async () => {
      const result = await getArchivedGroups()
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: Boolean(user),
  })

  return (
    <div className="animate-fade-up-in mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-10">
      {/* New Group — primary action */}
      <div className="mb-6">
        <Button
          className="h-14 w-full gap-2 text-base"
          onClick={() => createGroupMutation.mutate()}
          disabled={createGroupMutation.isPending}
        >
          {createGroupMutation.isPending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Plus className="size-5" />
          )}
          New Group
        </Button>
      </div>

      {/* Groups list — primary content */}
      <section aria-label="Your groups">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="size-4" />
          Your groups
        </h2>

        {groupsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : groupsError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Error loading groups: {groupsError.message}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No groups yet. Tap New Group to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group: DashboardGroup) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="active-scale flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:border-[var(--accent-light)] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {group.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
                {group.is_owner && (
                  <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-xs font-medium text-primary">
                    Owner
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Archived groups — only shown when the user has archived groups */}
      {archivedGroups && archivedGroups.length > 0 && (
        <section aria-label="Archived groups" className="mt-6">
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="mb-3 flex w-full items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            <Users className="size-4" />
            Archived groups ({archivedGroups.length})
            <span className="ml-auto text-xs font-normal normal-case">
              {showArchived ? 'Hide' : 'Show'}
            </span>
          </button>

          {showArchived && (
            <div className="space-y-2">
              {archivedGroups.map((group: DashboardGroup) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 opacity-60 transition hover:opacity-100 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {group.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''} · Archived
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Archived
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
