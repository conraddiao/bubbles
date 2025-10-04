'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Users, ExternalLink, MoreVertical, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  getUserGroups, 
  closeContactGroup,
  regenerateGroupToken 
} from '@/lib/database'
import { toast } from 'sonner'
import type { ContactGroup } from '@/types'

interface GroupDashboardProps {
  onCreateGroup?: () => void
  onViewGroup?: (groupId: string) => void
}

export function GroupDashboard({ onCreateGroup, onViewGroup }: GroupDashboardProps) {
  const queryClient = useQueryClient()

  const { data: groups, isLoading } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const result = await getUserGroups()
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data || []
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Groups</h2>
          <Button onClick={onCreateGroup}>Create Group</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }



  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first contact group to start collecting participant information.
        </p>
        <Button onClick={onCreateGroup}>Create Your First Group</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Groups</h2>
        <Button onClick={onCreateGroup}>Create Group</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group: ContactGroup) => (
          <GroupCard 
            key={group.id} 
            group={group} 
            onViewGroup={onViewGroup}
          />
        ))}
      </div>
    </div>
  )
}

interface GroupCardProps {
  group: ContactGroup
  onViewGroup?: (groupId: string) => void
}

function GroupCard({ group, onViewGroup }: GroupCardProps) {
  const [showActions, setShowActions] = useState(false)
  const queryClient = useQueryClient()

  const closeGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const result = await closeContactGroup(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      toast.success('Group closed successfully')
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to close group')
    },
  })

  const regenerateTokenMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const result = await regenerateGroupToken(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
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
    const shareUrl = `${window.location.origin}/join/${group.share_token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleCloseGroup = () => {
    if (confirm('Are you sure you want to close this group? This will notify all members and prevent new joiners.')) {
      closeGroupMutation.mutate(group.id)
    }
  }

  const handleRegenerateToken = () => {
    if (confirm('Are you sure you want to regenerate the share link? The old link will stop working.')) {
      regenerateTokenMutation.mutate(group.id)
    }
  }

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{group.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {group.description || 'No description'}
            </CardDescription>
          </div>
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </CardAction>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={group.is_closed ? 'secondary' : 'default'}>
            {group.is_closed ? 'Closed' : 'Active'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {group.member_count || 0} members
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewGroup?.(group.id)}
            className="flex-1"
          >
            <Users className="h-4 w-4" />
            View Members
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyShareLink}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/join/${group.share_token}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {showActions && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateToken}
              disabled={regenerateTokenMutation.isPending}
              className="w-full justify-start"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate Share Link
            </Button>
            {!group.is_closed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseGroup}
                disabled={closeGroupMutation.isPending}
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Close Group
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}