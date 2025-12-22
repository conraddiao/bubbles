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
import { getDisplayName, getInitials } from '@/lib/name-utils'

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
  layout?: 'card' | 'embedded'
}

interface MemberListHeaderProps {
  memberCount: number
  groupName: string
  onExportContacts?: () => void
}

const MemberListHeader = ({ memberCount, groupName, onExportContacts }: MemberListHeaderProps) => (
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-lg font-semibold leading-tight">Group Members</h3>
      <p className="text-sm text-muted-foreground">
        {memberCount} member{memberCount !== 1 ? 's' : ''} in {groupName}
      </p>
    </div>
    {onExportContacts && memberCount > 0 && (
      <Button onClick={onExportContacts} variant="outline" size="sm">
        <Download className="h-4 w-4" />
        Export Contacts
      </Button>
    )}
  </div>
)

export function MemberList({ groupId, groupName, isOwner, onExportContacts, layout = 'card' }: MemberListProps) {
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
      const message = err instanceof Error ? err.message : 'Failed to remove member'
      toast.error(message)
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

    if (confirm(`Are you sure you want to remove ${getDisplayName(member)} from the group?`)) {
      removeMemberMutation.mutate(member.id)
    }
  }

  const memberCount = members?.length ?? 0

  const mobileList = members ? (
    <div className="flex flex-col gap-3 md:hidden">
      {members.map((member) => (
        <div key={member.id} className="rounded-lg border bg-card/50 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {getInitials(member)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{getDisplayName(member)}</span>
                {member.is_owner && (
                  <Badge variant="secondary" className="text-xs">
                    Owner
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
            {isOwner && !member.is_owner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMember(member)}
                disabled={removeMemberMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {member.notifications_enabled ? (
                <>
                  <Bell className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Enabled</span>
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  <span>Disabled</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px]">
                Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : null

  if (isLoading) {
    const skeleton = (
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
    )
    return layout === 'card' ? (
      <Card>
        <CardHeader>
          <MemberListHeader
            memberCount={memberCount}
            groupName={groupName}
            onExportContacts={onExportContacts}
          />
        </CardHeader>
        <CardContent>{skeleton}</CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        <MemberListHeader
          memberCount={memberCount}
          groupName={groupName}
          onExportContacts={onExportContacts}
        />
        {skeleton}
      </div>
    )
  }

  if (error) {
    const content = (
      <p className="text-sm text-muted-foreground">
        {error.message || 'An error occurred while loading group members.'}
      </p>
    )
    return layout === 'card' ? (
      <Card>
        <CardHeader>
          <MemberListHeader
            memberCount={memberCount}
            groupName={groupName}
            onExportContacts={onExportContacts}
          />
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    ) : (
      <div className="space-y-2">
        <MemberListHeader
          memberCount={memberCount}
          groupName={groupName}
          onExportContacts={onExportContacts}
        />
        {content}
      </div>
    )
  }

  if (!members || members.length === 0) {
    const emptyState = (
      <div className="text-center py-6 rounded-lg border border-dashed">
        <Users className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Share your group link to start collecting contact information.
        </p>
      </div>
    )

    return layout === 'card' ? (
      <Card>
        <CardHeader>
          <MemberListHeader
            memberCount={memberCount}
            groupName={groupName}
            onExportContacts={onExportContacts}
          />
        </CardHeader>
        <CardContent>{emptyState}</CardContent>
      </Card>
    ) : (
      <div className="space-y-4">
        <MemberListHeader
          memberCount={memberCount}
          groupName={groupName}
          onExportContacts={onExportContacts}
        />
        {emptyState}
      </div>
    )
  }

  const table = (
    <div className="hidden rounded-md border md:block">
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
                      {getInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getDisplayName(member)}</span>
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
  )

  return layout === 'card' ? (
    <Card>
      <CardHeader>
        <MemberListHeader
          memberCount={memberCount}
          groupName={groupName}
          onExportContacts={onExportContacts}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {mobileList}
        {table}
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-4">
      <MemberListHeader
        memberCount={memberCount}
        groupName={groupName}
        onExportContacts={onExportContacts}
      />
      {mobileList}
      {table}
    </div>
  )
}
