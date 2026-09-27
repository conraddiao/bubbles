'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { ContactGroup } from '@/types'
import { getGroupByToken } from '@/lib/database'
import { PrintSheet } from '@/components/groups/print-sheet'

export const dynamic = 'force-dynamic'

interface PrintPageProps {
  params: Promise<{ token: string }>
}

/**
 * Printable join sheet for a group — reachable by share token, mirroring the
 * reachability of the join URL itself. The entry point into this page is
 * owner-only (see QrCodeHero), but the page is not owner-gated.
 */
export default function GroupPrintPage({ params }: PrintPageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token

  const { data: group, isLoading } = useQuery<ContactGroup | null, Error>({
    queryKey: ['group-by-token', token],
    queryFn: async () => {
      const result = await getGroupByToken(token)
      if (result.error) throw new Error(result.error)
      return result.data as ContactGroup
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F6EFE5]">
        <Loader2 className="h-6 w-6 animate-spin text-[#E8622A]" aria-label="Loading" />
      </div>
    )
  }

  if (!group) return <PrintUnavailable message="The group link is invalid or the group no longer exists." />
  if (group.is_closed) return <PrintUnavailable message="This group is no longer accepting new members." />
  if (group.archived_at) return <PrintUnavailable message="This group is no longer available." />

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const joinUrl = origin ? `${origin}/group/${group.share_token}/join` : ''
  const displayUrl = joinUrl.replace(/^https?:\/\//, '')

  return (
    <PrintSheet
      groupName={group.name}
      joinUrl={joinUrl}
      displayUrl={displayUrl}
      backHref={`/group/${group.share_token}`}
    />
  )
}

function PrintUnavailable({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#F6EFE5] px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-[#1C1713]">
        Nothing to print
      </h1>
      <p className="max-w-sm text-[#7A6E63]">{message}</p>
      <Link
        href="/dashboard"
        className="font-label text-sm font-semibold text-[#E8622A] hover:text-[#B84A1A]"
      >
        Back to your groups
      </Link>
    </div>
  )
}
