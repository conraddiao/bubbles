'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Users, ExternalLink, Settings, Download, UserPlus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MemberList } from './member-list'
import { ContactExport } from './contact-export'
import { GroupSettings } from './group-settings'

interface SingleGroupDashboardProps {
  groupId: string
}

interface GroupMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_owner: boolean;
}

export function SingleGroupDashboard({ groupId }: SingleGroupDashboardProps) {
  const [showShareLink, setShowShareLink] = useState(false)
  const [currentView, setCurrentView] = useState<'dashboard' | 'members' | 'export' | 'settings'>('dashboard')
  const [isOwner, setIsOwner] = useState(false)

  // Fetch group details with better error handling
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      console.log('Fetching group with ID:', groupId)
      
      // First verify we have a user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('User auth error:', userError)
        throw new Error('Authentication error')
      }
      if (!user) {
        throw new Error('Not authenticated')
      }
      
      console.log('User authenticated:', user.id)
      
      // Try to fetch the group
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('id', groupId)
        .single()
      
      if (error) {
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        })
        throw error
      }
      
      console.log('Group fetched successfully:', data)
      
      // Check if current user is the owner
      setIsOwner(data.owner_id === user.id)
      
      return data
    },
    retry: 1,
  })

  // Fetch group members with better error handling
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      console.log('Fetching members for group:', groupId)
      
      const { data, error } = await supabase
        .from('group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })
      
      if (error) {
        console.error('Members fetch error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: error
        })
        throw error
      }
      
      console.log('Members fetched successfully:', data)
      return data || []
    },
    enabled: !!groupId, // Only run if we have a groupId
  })

  const handleCopyShareLink = async () => {
    if (!group?.share_token) return
    
    const shareUrl = `${window.location.origin}/join/${group.share_token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleOpenShareLink = () => {
    if (!group?.share_token) return
    window.open(`/join/${group.share_token}`, '_blank')
  }

  if (groupLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-6"></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
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

  // Render different views based on currentView state
  if (currentView === 'members') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{group.name} - Members</h1>
            <p className="text-muted-foreground">Manage group members and their information</p>
          </div>
        </div>
        <MemberList 
          groupId={groupId} 
          groupName={group.name}
          isOwner={isOwner}
          onExportContacts={() => setCurrentView('export')}
        />
      </div>
    )
  }

  if (currentView === 'export') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{group.name} - Export Contacts</h1>
            <p className="text-muted-foreground">Download member contact information</p>
          </div>
        </div>
        <ContactExport 
          groupId={groupId} 
          groupName={group.name}
        />
      </div>
    )
  }

  if (currentView === 'settings' && isOwner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{group.name} - Settings</h1>
            <p className="text-muted-foreground">Manage group settings and preferences</p>
          </div>
        </div>
        <GroupSettings 
          groupId={groupId}
          onBack={() => setCurrentView('dashboard')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <Badge variant={group.is_closed ? 'secondary' : 'default'}>
            {group.is_closed ? 'Closed' : 'Active'}
          </Badge>
        </div>
        {group.description && (
          <p className="text-muted-foreground text-lg">{group.description}</p>
        )}
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Share Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Members
            </CardTitle>
            <CardDescription>
              Share this link with people you want to join your group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {showShareLink && (
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm break-all">
                  {`${window.location.origin}/join/${group.share_token}`}
                </code>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareLink(!showShareLink)}
                className="flex-1"
              >
                {showShareLink ? 'Hide Link' : 'Show Link'}
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
                onClick={handleOpenShareLink}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members
            </CardTitle>
            <CardDescription>
              {members?.length || 0} people in this group
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : members && members.length > 0 ? (
              <div className="space-y-2">
                {members.slice(0, 3).map((member: GroupMember) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{member.first_name} {member.last_name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </div>
                ))}
                {members.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{members.length - 3} more members
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No members yet</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => setCurrentView('members')}
            >
              <Users className="h-4 w-4 mr-2" />
              View All Members
            </Button>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group Actions
            </CardTitle>
            <CardDescription>
              Manage your group settings and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setCurrentView('export')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Contacts
            </Button>
            {isOwner && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setCurrentView('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Group Settings
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates and member activity in your group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent activity to show.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}