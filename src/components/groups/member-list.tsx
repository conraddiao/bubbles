'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Phone, Mail, Bell, BellOff, Users, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  getGroupMembers, 
  removeGroupMember,
  subscribeToGroupMembers 
} from '@/lib/database'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface GroupMember {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  notifications_enabled: boolean
  joined_at: string
  is_owner: boolean
}

interface MemberListProps {
  groupId: string
  groupName: string
  isOwner: boolean
  onExportContacts?: () => void
}

export function MemberList({ groupId, groupName, isOwner, onExportContacts }: MemberListProps) {
  const queryClient = useQueryClient()

  const { data: members, isLoading, error } = useQuery<GroupMember[]>({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const result = await getGroupMembers(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
      return (result.data || []) as GroupMember[]
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const result = await removeGroupMember(membershipId)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: () => {
      toast.success('Member removed successfully')
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove member')
    },
  })

  // Set up real-time subscription for member updates
  useEffect(() => {
    const subscription = subscribeToGroupMembers(groupId, () => {
      // Invalidate and refetch member data when changes occur
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [groupId, queryClient])

  const handleRemoveMember = (member: GroupMember) => {
    if (member.is_owner) {
      toast.error('Cannot remove the group owner')
      return
    }

    if (confirm(`Are you sure you want to remove ${member.first_name} ${member.last_name} from the group?`)) {
      removeMemberMutation.mutate(member.id)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Members</CardTitle>
          <CardDescription>Loading members...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Members</CardTitle>
          <CardDescription>Failed to load members</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An error occurred while loading group members.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!members || members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Members</CardTitle>
          <CardDescription>No members have joined yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Share your group link to start collecting contact information.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Group Members</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} in {groupName}
            </CardDescription>
          </div>
          {onExportContacts && members.length > 0 && (
            <Button onClick={onExportContacts} variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export Contacts
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Notifications</TableHead>
                <TableHead>Joined</TableHead>
                {isOwner && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(`${member.first_name} ${member.last_name}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.first_name} {member.last_name}</span>
                          {member.is_owner && (
                            <Badge variant="secondary" className="text-xs">
                              Owner
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {member.notifications_enabled ? (
                        <>
                          <Bell className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Enabled</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Disabled</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      {!member.is_owner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeMemberMutation.isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}