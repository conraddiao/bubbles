'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArchiveRestore } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { MemberList } from './member-list'
import { GroupSettingsDrawer } from './group-settings-drawer'

const QrCodeHero = dynamic(
  () => import('./qr-code-hero').then(m => ({ default: m.QrCodeHero })),
  { ssr: false, loading: () => <div className="h-[300px] rounded-3xl bg-accent/10" /> }
)
import { ShareLinkAnalytics } from './share-link-analytics'
import type { Database } from '@/types'
import { getGroupMembers, unarchiveContactGroup } from '@/lib/database'
import { useRouter } from 'next/navigation'

interface SingleGroupDashboardProps {
  token: string
  showSuccessToast?: boolean
  showQrCode?: boolean
  showCube?: boolean
}

type ContactGroupRow = Database['public']['Tables']['contact_groups']['Row']
type GroupMember = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string | null
  notifications_enabled: boolean
  joined_at: string
  is_owner: boolean
}

export function SingleGroupDashboard({ token, showSuccessToast, showQrCode = true, showCube = true }: SingleGroupDashboardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery<ContactGroupRow | null, Error>({
    queryKey: ['group', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('share_token', token)
        .single<ContactGroupRow>()

      if (error) throw error
      return data
    },
  })

  const isOwner = !!group && !!currentUserId && group.owner_id === currentUserId

  const groupId = group?.id ?? ''

  const { data: members } = useQuery<GroupMember[], Error>({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const result = await getGroupMembers(groupId)
      if (result.error) throw new Error(result.error)
      return (result.data || []) as GroupMember[]
    },
    enabled: !!groupId,
  })

  useEffect(() => {
    if (showSuccessToast) {
      toast.success('Group created! Share the QR code to invite people.')
    }
  }, [showSuccessToast])

  const shareUrl =
    typeof window !== 'undefined' && group
      ? `${window.location.origin}/join/${group.share_token}`
      : ''

  const totalMembers = members?.length ?? 0

  const unarchiveMutation = useMutation({
    mutationFn: async () => {
      const result = await unarchiveContactGroup(groupId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Group unarchived and restored to your dashboard.')
      queryClient.invalidateQueries({ queryKey: ['group', token] })
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      queryClient.invalidateQueries({ queryKey: ['archived-groups'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to unarchive group'
      toast.error(message)
    },
  })

  if (groupLoading) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-col items-center gap-5 bg-[#E8622A] px-6 py-10">
          <div className="h-8 w-48 animate-pulse rounded bg-[#FEFAF4]/20" />
          <div className="h-[232px] w-[232px] animate-pulse rounded-2xl bg-[#FEFAF4]/20" />
        </div>
      </div>
    )
  }

  if (groupError || (!groupLoading && !group)) {
    return (
      <div className="px-4 py-12 text-center">
        <h3 className="mb-2 text-lg font-semibold">Group not found</h3>
        <p className="mb-4 text-[#7A6E63]">
          The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        {groupError && (
          <p className="text-sm text-[#C53030]">Error: {groupError.message}</p>
        )}
      </div>
    )
  }

  if (!group) return null

  return (
    <div className="flex min-h-screen flex-col">
      {/* Archived banner */}
      {group.archived_at && isOwner && (
        <div className="flex items-center justify-between bg-[#F0E8D9] px-4 py-2.5">
          <p className="text-sm text-[#7A6E63]">This group is archived</p>
          <button
            onClick={() => unarchiveMutation.mutate()}
            disabled={unarchiveMutation.isPending}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#E8622A] disabled:opacity-50 active-scale"
          >
            <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
            {unarchiveMutation.isPending ? 'Restoring…' : 'Unarchive'}
          </button>
        </div>
      )}

      {/* QR hero — the moment */}
      <QrCodeHero
        groupName={group.name}
        shareUrl={shareUrl}
        memberCount={totalMembers}
        onSettingsClick={() => setDrawerOpen(true)}
        showQrCode={showQrCode}
        showCube={showCube}
      />

      {/* Share link analytics — owner only */}
      {isOwner && groupId && (
        <div className="px-4 pt-6">
          <ShareLinkAnalytics groupId={groupId} />
        </div>
      )}

      {/* Members */}
      <div className="px-4 py-6">
        <MemberList
          groupId={groupId}
          groupName={group.name}
          isOwner={isOwner}
          layout="embedded"
        />
      </div>

      {/* Settings drawer */}
      {group && (
        <GroupSettingsDrawer
          groupId={groupId}
          group={group}
          isOwner={isOwner}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onLeaveSuccess={() => router.push('/dashboard')}
        />
      )}
    </div>
  )
}
