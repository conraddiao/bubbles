'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { archiveContactGroup, leaveGroup, updateGroupDetails } from '@/lib/database'
import type { Database } from '@/types'

type ContactGroupRow = Database['public']['Tables']['contact_groups']['Row']
type AccessType = ContactGroupRow['access_type']

interface GroupSettingsDrawerProps {
  groupId: string
  group: ContactGroupRow
  isOwner: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeaveSuccess: () => void
}

export function GroupSettingsDrawer({
  groupId,
  group,
  isOwner,
  open,
  onOpenChange,
  onLeaveSuccess,
}: GroupSettingsDrawerProps) {
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<{
    name: string
    description: string
    access_type: AccessType
    is_closed: boolean
    password: string
  }>({
    name: group.name,
    description: group.description || '',
    access_type: group.access_type,
    is_closed: group.is_closed,
    password: '',
  })

  useEffect(() => {
    setFormState({
      name: group.name,
      description: group.description || '',
      access_type: group.access_type,
      is_closed: group.is_closed,
      password: '',
    })
  }, [group])

  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      if (formState.access_type === 'password' && !formState.password && !group.join_password_hash) {
        throw new Error('Add a password to enable password protection.')
      }
      const passwordValue =
        formState.access_type === 'password' ? formState.password || undefined : null
      const result = await updateGroupDetails(groupId, {
        name: formState.name,
        description: formState.description,
        is_closed: formState.is_closed,
        access_type: formState.access_type,
        password: passwordValue,
      })
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Group settings saved')
      setFormState((prev) => ({ ...prev, password: '' }))
      queryClient.invalidateQueries({ queryKey: ['group', group.share_token] })
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update group settings'
      toast.error(message)
    },
  })

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const result = await leaveGroup(groupId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('You left the group')
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', group.share_token] })
      onLeaveSuccess()
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to leave group'
      toast.error(message)
    },
  })

  const archiveGroupMutation = useMutation({
    mutationFn: async () => {
      const result = await archiveContactGroup(groupId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Group archived')
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      queryClient.invalidateQueries({ queryKey: ['archived-groups'] })
      onLeaveSuccess()
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to archive group'
      toast.error(message)
    },
  })

  const handleLeave = () => {
    if (leaveGroupMutation.isPending) return
    if (confirm('Are you sure you want to leave this group?')) {
      leaveGroupMutation.mutate()
    }
  }

  const handleArchive = () => {
    if (archiveGroupMutation.isPending) return
    if (confirm('Archive this group? It will be hidden from your dashboard.')) {
      archiveGroupMutation.mutate()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#1C1713]/40 data-[state=open]:animate-fade-up-in" />
        <Dialog.Content
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[#FEFAF4] p-5 shadow-2xl focus:outline-none data-[state=open]:animate-fade-up-in"
          aria-describedby={undefined}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#E0D5C5]" />

          <Dialog.Title className="font-label mb-4 text-lg font-semibold text-[#1C1713]">
            {isOwner ? 'Group settings' : 'Options'}
          </Dialog.Title>

          {isOwner ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1C1713]">Group name</label>
                <Input
                  value={formState.name}
                  onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={updateGroupMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1C1713]">Description</label>
                <Textarea
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={updateGroupMutation.isPending}
                  rows={2}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-[#E0D5C5] p-3">
                <p className="text-sm font-medium text-[#1C1713]">Access</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, access_type: 'open' }))}
                    disabled={updateGroupMutation.isPending}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold font-label transition-colors active-scale ${
                      formState.access_type === 'open'
                        ? 'bg-[#E8622A] text-[#FEFAF4]'
                        : 'border border-[#E0D5C5] text-[#7A6E63]'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, access_type: 'password' }))}
                    disabled={updateGroupMutation.isPending}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold font-label transition-colors active-scale ${
                      formState.access_type === 'password'
                        ? 'bg-[#E8622A] text-[#FEFAF4]'
                        : 'border border-[#E0D5C5] text-[#7A6E63]'
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    Password
                  </button>
                </div>
                {formState.access_type === 'password' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[#1C1713]">
                      {group.join_password_hash ? 'Update password' : 'Set password'}
                    </label>
                    <Input
                      type="password"
                      placeholder={
                        group.join_password_hash
                          ? 'Enter a new password (optional)'
                          : 'Enter a password'
                      }
                      value={formState.password}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, password: e.target.value }))
                      }
                      disabled={updateGroupMutation.isPending}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1C1713]">Closed to new members</p>
                    <p className="text-xs text-[#7A6E63]">Existing members stay, no new joins</p>
                  </div>
                  <Switch
                    checked={formState.is_closed}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({ ...prev, is_closed: checked }))
                    }
                    disabled={updateGroupMutation.isPending}
                  />
                </div>
              </div>

              <button
                onClick={() => updateGroupMutation.mutate()}
                disabled={updateGroupMutation.isPending}
                className="w-full rounded-xl bg-[#E8622A] py-3 text-sm font-semibold text-[#FEFAF4] font-label transition-colors hover:bg-[#B84A1A] disabled:opacity-50 active-scale"
              >
                {updateGroupMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>

              <div className="border-t border-[#E0D5C5] pt-3">
                <button
                  onClick={handleArchive}
                  disabled={archiveGroupMutation.isPending}
                  className="w-full rounded-xl border border-[#7A6E63] py-3 text-sm font-semibold text-[#7A6E63] font-label transition-colors hover:bg-[#F0E8D9] disabled:opacity-50 active-scale"
                >
                  {archiveGroupMutation.isPending ? 'Archiving...' : 'Archive group'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleLeave}
                disabled={leaveGroupMutation.isPending}
                className="w-full rounded-xl border border-[#C53030] py-3 text-sm font-semibold text-[#C53030] font-label transition-colors hover:bg-[#FEE2E2] disabled:opacity-50 active-scale"
              >
                {leaveGroupMutation.isPending ? 'Leaving...' : 'Leave group'}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
