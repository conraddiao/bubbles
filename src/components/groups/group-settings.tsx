'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { ArrowLeft, Copy, ExternalLink, Trash2, UserMinus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  getGroupMembers, 
  removeGroupMember, 
  closeContactGroup,
  regenerateGroupToken,
  getUserGroups
} from '@/lib/database'

import { toast } from 'sonner'
import type { ContactGroup } from '@/types'

interface GroupSettingsProps {
  groupId: string
  onBack?: () => void
}

export function GroupSettings({ groupId, onBack }: GroupSettingsProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members')
  const queryClient = useQueryClient()

  // Get group details from the user groups query
  const { data: groups } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const result = await getUserGroups()
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
  })

  const group = groups?.find((g: ContactGroup) => g?.id === groupId)

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const result = await getGroupMembers(groupId)
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: !!groupId,
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const result = await removeGroupMember(membershipId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Member removed successfully')
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove member')
    },
  })

  const closeGroupMutation = useMutation({
    mutationFn: async () => {
      const result = await closeContactGroup(groupId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Group closed successfully. All members have been notified.')
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      onBack?.()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to close group')
    },
  })

  const regenerateTokenMutation = useMutation({
    mutationFn: async () => {
      const result = await regenerateGroupToken(groupId)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      toast.success('Share link regenerated successfully')
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to regenerate share link')
    },
  })

  const handleCopyShareLink = async () => {
    if (!group) return
    const shareUrl = `${window.location.origin}/join/${group?.share_token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleRemoveMember = (membershipId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from this group?`)) {
      removeMemberMutation.mutate(membershipId)
    }
  }

  const handleCloseGroup = () => {
    if (confirm('Are you sure you want to close this group? This will notify all members and prevent new joiners. This action cannot be undone.')) {
      closeGroupMutation.mutate()
    }
  }

  const handleRegenerateToken = () => {
    if (confirm('Are you sure you want to regenerate the share link? The old link will stop working immediately.')) {
      regenerateTokenMutation.mutate()
    }
  }

  if (!group) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{group?.name}</h2>
          <p className="text-muted-foreground">{group?.description || 'No description'}</p>
        </div>
        <Badge variant={group?.is_closed ? 'secondary' : 'default'} className="ml-auto">
          {group?.is_closed ? 'Closed' : 'Active'}
        </Badge>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'members' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('members')}
        >
          Members ({members?.length || 0})
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </Button>
      </div>

      {activeTab === 'members' && (
        <MembersTab
          members={members || []}
          isLoading={membersLoading}
          onRemoveMember={handleRemoveMember}
          isGroupClosed={group?.is_closed || false}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          group={group}
          onCopyShareLink={handleCopyShareLink}
          onRegenerateToken={handleRegenerateToken}
          onCloseGroup={handleCloseGroup}
          isRegenerating={regenerateTokenMutation.isPending}
          isClosing={closeGroupMutation.isPending}
        />
      )}
    </div>
  )
}

interface MembersTabProps {
  members: Array<{
    id: string
    full_name: string
    email: string
    phone?: string
    notifications_enabled: boolean
    joined_at: string
    is_owner: boolean
  }>
  isLoading: boolean
  onRemoveMember: (membershipId: string, memberName: string) => void
  isGroupClosed: boolean
}

function MembersTab({ members, isLoading, onRemoveMember, isGroupClosed }: MembersTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-48"></div>
                </div>
                <div className="h-8 w-8 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No members have joined this group yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <Card key={member.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{member.full_name}</h4>
                  {member.is_owner && (
                    <Badge variant="secondary" className="text-xs">Owner</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                {member.phone && (
                  <p className="text-sm text-muted-foreground">{member.phone}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                  {member.notifications_enabled && ' • Notifications enabled'}
                </p>
              </div>
              {!member.is_owner && !isGroupClosed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveMember(member.id, member.full_name)}
                  className="text-destructive hover:text-destructive"
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface SettingsTabProps {
  group: ContactGroup
  onCopyShareLink: () => void
  onRegenerateToken: () => void
  onCloseGroup: () => void
  isRegenerating: boolean
  isClosing: boolean
}

function SettingsTab({ 
  group, 
  onCopyShareLink, 
  onRegenerateToken, 
  onCloseGroup,
  isRegenerating,
  isClosing
}: SettingsTabProps) {
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${group?.share_token}`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>
            Basic information about your group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Group Name</label>
            <p className="text-sm text-muted-foreground mt-1">{group?.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <p className="text-sm text-muted-foreground mt-1">
              {group?.description || 'No description provided'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Created</label>
            <p className="text-sm text-muted-foreground mt-1">
              {group?.created_at ? new Date(group.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Share Link</CardTitle>
          <CardDescription>
            Share this link with participants to let them join your group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={onCopyShareLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(shareUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={onRegenerateToken}
            disabled={isRegenerating || group?.is_closed}
          >
            <RefreshCw className="h-4 w-4" />
            {isRegenerating ? 'Regenerating...' : 'Regenerate Link'}
          </Button>
        </CardContent>
      </Card>

      {!group?.is_closed && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that will affect all group members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={onCloseGroup}
              disabled={isClosing}
            >
              <Trash2 className="h-4 w-4" />
              {isClosing ? 'Closing Group...' : 'Close Group'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will notify all members, prevent new joiners, and optionally send contact exports.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}