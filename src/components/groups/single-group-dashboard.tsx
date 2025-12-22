'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Users, ExternalLink, Settings, Download, Share2, Lock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MemberList } from './member-list'
import { ContactExport } from './contact-export'
import type { Database } from '@/types'
import { getGroupMembers, leaveGroup, updateGroupDetails } from '@/lib/database'
import { useRouter } from 'next/navigation'

interface SingleGroupDashboardProps {
  groupId: string
}

type ContactGroupRow = Database['public']['Tables']['contact_groups']['Row']
type AccessType = ContactGroupRow['access_type']
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

export function SingleGroupDashboard({ groupId }: SingleGroupDashboardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const exportSectionRef = useRef<HTMLDivElement>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [formState, setFormState] = useState<{
    name: string
    description: string
    access_type: AccessType
    is_closed: boolean
    password: string
  }>({
    name: '',
    description: '',
    access_type: 'open',
    is_closed: false,
    password: ''
  })

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery<ContactGroupRow | null, Error>({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        throw userError
      }
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('id', groupId)
        .single<ContactGroupRow>()

      if (error) {
        throw error
      }

      setIsOwner(data.owner_id === user.id)
      return data
    },
    retry: 1,
  })

  const { data: members, error: membersError } = useQuery<GroupMember[], Error>({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const result = await getGroupMembers(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
      return (result.data || []) as GroupMember[]
    },
    enabled: !!groupId,
  })

  useEffect(() => {
    if (group) {
      setFormState({
        name: group.name,
        description: group.description || '',
        access_type: group.access_type,
        is_closed: group.is_closed,
        password: ''
      })
    }
  }, [group])

  const updateGroupMutation = useMutation({
    mutationFn: async () => {
      if (!group) {
        throw new Error('Group not loaded yet.')
      }

      if (formState.access_type === 'password' && !formState.password && !group.join_password_hash) {
        throw new Error('Add a password to enable password protection.')
      }

      const passwordValue =
        formState.access_type === 'password'
          ? formState.password || undefined
          : null

      const result = await updateGroupDetails(groupId, {
        name: formState.name,
        description: formState.description,
        is_closed: formState.is_closed,
        access_type: formState.access_type,
        password: passwordValue
      })

      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Group settings saved')
      setFormState((prev) => ({ ...prev, password: '' }))
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update group settings'
      toast.error(message)
    }
  })

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      const result = await leaveGroup(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      toast.success('You left the group')
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      router.push('/')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to leave group'
      toast.error(message)
    }
  })

  const shareUrl = typeof window !== 'undefined' && group ? `${window.location.origin}/join/${group.share_token}` : ''
  const accessBadge = group?.access_type === 'password' ? 'Password required' : 'Open link'

  const handleCopyShareLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to copy link'
      toast.error(message)
    }
  }

  const handleShareGroup = async () => {
    if (!shareUrl) return

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: group?.name ?? 'Contact group invite',
          text: group?.description ?? 'Join my contact group on bubbles.fyi',
          url: shareUrl
        })
        return
      } catch (error: unknown) {
        const isAbort = error instanceof Error && error.name === 'AbortError'
        if (isAbort) return
        await handleCopyShareLink()
        return
      }
    }

    await handleCopyShareLink()
  }

  const handleOpenShareLink = () => {
    if (!group?.share_token || typeof window === 'undefined') return
    window.open(`/join/${group.share_token}`, '_blank')
  }

  const handleScrollToExport = () => {
    if (exportSectionRef.current) {
      exportSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (groupLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-3 rounded-xl border bg-card/80 p-6 shadow-sm">
          <div className="h-8 w-1/3 bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-muted rounded w-full mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (groupError || (!groupLoading && !group)) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Group not found</h3>
        <p className="text-muted-foreground mb-4">
          The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        {groupError && (
          <p className="text-sm text-red-600">
            Error: {groupError.message}
          </p>
        )}
      </div>
    )
  }

  if (!group) {
    return null
  }

  const totalMembers = members?.length || 0

  return (
    <div className="mx-auto space-y-6 max-w-4xl px-1 sm:px-0">
      <div className="rounded-xl border bg-card/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold leading-tight">{group.name}</h1>
              <Badge variant={group.is_closed ? 'secondary' : 'default'}>
                {group.is_closed ? 'Closed to new members' : 'Accepting members'}
              </Badge>
              <Badge variant={group.access_type === 'password' ? 'secondary' : 'outline'}>
                {accessBadge}
              </Badge>
            </div>
            {group.description && (
              <p className="text-muted-foreground text-base max-w-3xl">{group.description}</p>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 lg:ml-auto lg:w-auto lg:flex-row lg:items-center">
            <Button className="w-full justify-center sm:w-auto" variant="outline" size="sm" onClick={handleShareGroup}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button className="w-full justify-center sm:w-auto" variant="outline" size="sm" onClick={handleCopyShareLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button className="w-full justify-center sm:w-auto" variant="ghost" size="icon" onClick={handleOpenShareLink}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {totalMembers} member{totalMembers === 1 ? '' : 's'} can access this group.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members & contacts
              </CardTitle>
              <CardDescription>
                View everyone in the group, remove users, or export contacts.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:w-auto">
              <Button className="w-full justify-center sm:w-auto" variant="outline" size="sm" onClick={handleShareGroup}>
                <Share2 className="h-4 w-4 mr-2" />
                Share group
              </Button>
              <Button className="w-full justify-center sm:w-auto" variant="outline" size="sm" onClick={handleScrollToExport}>
                <Download className="h-4 w-4 mr-2" />
                Contact export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <MemberList 
              groupId={groupId} 
              groupName={group.name}
              isOwner={isOwner}
              onExportContacts={handleScrollToExport}
              layout="embedded"
            />
            <div ref={exportSectionRef} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold leading-tight flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download contacts
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Export all members or choose specific people to include.
                  </p>
                </div>
              </div>
              <ContactExport 
                groupId={groupId} 
                groupName={group.name}
                layout="embedded"
              />
            </div>
            {membersError && (
              <p className="text-sm text-destructive">
                {membersError.message || 'Unable to load members right now.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage group
            </CardTitle>
            <CardDescription>Update details and access controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group name</label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                disabled={!isOwner || updateGroupMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formState.description}
                onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                disabled={!isOwner || updateGroupMutation.isPending}
                rows={3}
              />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Access control</p>
                  <p className="text-xs text-muted-foreground">Choose how people join the group.</p>
                </div>
                <Badge variant="outline">{formState.access_type === 'password' ? 'Password' : 'Open'}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={formState.access_type === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormState((prev) => ({ ...prev, access_type: 'open' }))}
                  disabled={!isOwner || updateGroupMutation.isPending}
                >
                  Open link
                </Button>
                <Button
                  type="button"
                  variant={formState.access_type === 'password' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormState((prev) => ({ ...prev, access_type: 'password' }))}
                  disabled={!isOwner || updateGroupMutation.isPending}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Require password
                </Button>
              </div>
              {formState.access_type === 'password' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Set or update password</label>
                  <Input
                    type="password"
                    placeholder={group.join_password_hash ? 'Enter a new password (optional)' : 'Enter a password'}
                    value={formState.password}
                    onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                    disabled={!isOwner || updateGroupMutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Members will need this password when joining. Leave blank to keep the existing one.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Close group to new members</p>
                  <p className="text-xs text-muted-foreground">Existing members stay, but no new joins are allowed.</p>
                </div>
                <Switch
                  checked={formState.is_closed}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, is_closed: checked }))}
                  disabled={!isOwner || updateGroupMutation.isPending}
                />
              </div>
            </div>

            {isOwner && (
              <Button
                className="w-full"
                onClick={() => updateGroupMutation.mutate()}
                disabled={updateGroupMutation.isPending}
              >
                {updateGroupMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            )}

            <div className="border-t pt-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Leave group</p>
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll disappear from the public member list, but the group keeps a record that you left.
                  </p>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (leaveGroupMutation.isPending) return
                    if (confirm('Are you sure you want to leave this group?')) {
                      leaveGroupMutation.mutate()
                    }
                  }}
                  disabled={leaveGroupMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {leaveGroupMutation.isPending ? 'Leaving...' : 'Leave group'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
