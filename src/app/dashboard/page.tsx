"use client";

import Link from "next/link";

interface DashboardGroup {
  id: string;
  name: string;
  is_owner: boolean;
  member_count: number;
  share_token: string;
}
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  LogOut,
  Phone,
  Shield,
  ShieldCheck,
  Users,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useQuery } from '@tanstack/react-query'
import { getUserGroups } from '@/lib/database'
import { toast } from 'sonner'
import { SupabaseTest } from '@/components/debug/supabase-test'

// Force dynamic rendering
export const dynamic = "force-dynamic";

function DashboardContent() {
  const { user, profile, signOut } = useAuth()

  // Fetch user's groups
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['user-groups'],
    queryFn: async () => {
      const result = await getUserGroups()
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: !!user, // Only fetch when user is available
  })

  const handleCopyShareLink = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/join/${shareToken}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : user?.email}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage your contact groups and profile settings
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Debug component - remove after testing */}
        <SupabaseTest />
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Manage your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Name:</strong> {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : "Not set"}
                </p>
                <p>
                  <strong>Email:</strong> {profile?.email}
                </p>
                <div className="flex items-center gap-2">
                  <span>
                    <strong>Phone:</strong> {profile?.phone || "Not set"}
                  </span>
                  {profile?.phone_verified ? (
                    <Badge variant="secondary" className="text-xs">
                      Verified
                    </Badge>
                  ) : profile?.phone ? (
                    <Badge variant="outline" className="text-xs">
                      Unverified
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    <strong>2FA:</strong>
                  </span>
                  {profile?.two_factor_enabled ? (
                    <Badge variant="default" className="text-xs bg-green-600">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Disabled
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Link href="/profile/setup">
                  <Button className="w-full" variant="outline">
                    Edit Profile
                  </Button>
                </Link>
                {!profile?.phone_verified && (
                  <Link href="/profile/phone-verification">
                    <Button className="w-full" variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Verify Phone
                    </Button>
                  </Link>
                )}
                <Link href="/profile/2fa-setup">
                  <Button className="w-full" variant="outline" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    {profile?.two_factor_enabled ? "Manage 2FA" : "Setup 2FA"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Groups</CardTitle>
              <CardDescription>
                Contact groups you own or are a member of
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
              ) : groupsError ? (
                <div className="text-red-600 text-sm mb-4">
                  Error loading groups: {groupsError.message}
                </div>
              ) : !groups || groups.length === 0 ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    No groups yet. Create your first group to get started.
                  </p>
                  <Link href="/groups/create">
                    <Button className="w-full">Create Group</Button>
                  </Link>
                </>
              ) : (
                <div className="space-y-3">
                  {groups.slice(0, 3).map((group: DashboardGroup) => (
                    <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{group.name}</h4>
                          <Badge variant={group.is_owner ? "default" : "secondary"} className="text-xs">
                            {group.is_owner ? "Owner" : "Member"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/groups/${group.id}`}>
                          <Button variant="outline" size="sm">
                            <Users className="h-4 w-4" />
                          </Button>
                        </Link>
                        {group.is_owner && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCopyShareLink(group.share_token)}
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
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {groups.length > 3 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{groups.length - 3} more groups
                    </p>
                  )}
                  <Link href="/groups/create">
                    <Button className="w-full" variant="outline">Create New Group</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Join a Group
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Export Contacts
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Notification Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  
  // Simple auth check without ProtectedRoute to test for redirect loops
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Please log in to access the dashboard</h2>
          <a href="/auth" className="text-blue-600 hover:underline">Go to login</a>
        </div>
      </div>
    )
  }
  
  return <DashboardContent />
}
