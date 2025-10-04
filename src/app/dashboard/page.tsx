'use client'

import Link from 'next/link'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Settings, LogOut, Phone, Shield, ShieldCheck } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function DashboardContent() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {profile?.full_name || user?.email}!
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
                <p><strong>Name:</strong> {profile?.full_name || 'Not set'}</p>
                <p><strong>Email:</strong> {profile?.email}</p>
                <div className="flex items-center gap-2">
                  <span><strong>Phone:</strong> {profile?.phone || 'Not set'}</span>
                  {profile?.phone_verified ? (
                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                  ) : profile?.phone ? (
                    <Badge variant="outline" className="text-xs">Unverified</Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span><strong>2FA:</strong></span>
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
                    {profile?.two_factor_enabled ? 'Manage 2FA' : 'Setup 2FA'}
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
              <p className="text-sm text-gray-500 mb-4">
                No groups yet. Create your first group to get started.
              </p>
              <Button className="w-full">
                Create Group
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
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
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}