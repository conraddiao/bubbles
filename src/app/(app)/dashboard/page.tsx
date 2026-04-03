'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, Plus, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getUserGroups, getGroupByToken, getArchivedGroups, createContactGroup } from '@/lib/database'
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
      const result = await createContactGroup('New Group')
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

  const [codeValue, setCodeValue] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [isCheckingCode, setIsCheckingCode] = useState(false)
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

  const displayName = [
    profile?.first_name ?? user?.user_metadata?.first_name,
    profile?.last_name ?? user?.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  const greetingName = displayName || user?.email || 'there'

  const handleCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCodeError(null)

    const normalizedCode = codeValue.trim()
    if (!normalizedCode) {
      setCodeError('Enter a group code to continue.')
      return
    }

    setIsCheckingCode(true)
    try {
      const { data, error } = await getGroupByToken(normalizedCode)
      if (error || !data) {
        setCodeError('We couldn\u2019t find a group with that code.')
        return
      }
      router.push(`/join/${normalizedCode}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to check that code right now.'
      setCodeError(message)
    } finally {
      setIsCheckingCode(false)
    }
  }

  return (
    <div className="animate-fade-up-in mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-12">
      {/* Header with greeting and create button */}
      <header className="mb-8">
        <p className="font-label text-sm font-semibold uppercase tracking-wide text-primary">
          Shared Contact Groups
        </p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
            Welcome back, {greetingName}!
          </h1>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => createGroupMutation.mutate()}
            disabled={createGroupMutation.isPending}
          >
            {createGroupMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            New Group
          </Button>
        </div>
      </header>

      {/* Join group — inline input */}
      <form onSubmit={handleCodeSubmit} className="mb-8">
        <label htmlFor="join-code" className="mb-1.5 block text-sm font-medium">
          Join a group
        </label>
        <div className="flex gap-2">
          <Input
            id="join-code"
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            placeholder="Enter invite code"
            className="flex-1"
            autoComplete="off"
            inputMode="text"
            aria-invalid={Boolean(codeError)}
          />
          <Button type="submit" variant="secondary" className="shrink-0 gap-1.5" disabled={isCheckingCode}>
            <KeyRound className="size-4" />
            {isCheckingCode ? 'Checking\u2026' : 'Join'}
          </Button>
        </div>
        {codeError && <p className="mt-1.5 text-sm text-destructive">{codeError}</p>}
      </form>

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
              No groups yet. Create one or join with an invite code.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5"
              onClick={() => createGroupMutation.mutate()}
              disabled={createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Create your first group
            </Button>
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
