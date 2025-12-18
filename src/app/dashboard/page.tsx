"use client";

import Link from "next/link";

interface DashboardGroup {
  id: string;
  name: string;
  is_owner: boolean;
  member_count: number;
  share_token: string;
}
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  KeyRound,
  QrCode,
  Share2,
} from "lucide-react";
import { useQuery } from '@tanstack/react-query'
import { getUserGroups } from '@/lib/database'
import { toast } from 'sonner'

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

  const displayName = [
    profile?.first_name ?? user?.user_metadata?.first_name,
    profile?.last_name ?? user?.user_metadata?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const greetingName = displayName || user?.email || "there";

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-indigo-100 to-indigo-200">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-12 sm:py-16">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
            Shared Contact Groups
          </p>
          <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            Welcome back, {greetingName}!
          </h1>
          <p className="text-base text-slate-700 sm:text-lg">
            Jump into your groups or start a new one to keep everyone connected.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
            <Link href="/groups/create">
              <Button>
                Create Group
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/join">
              <Button variant="outline">Join Group</Button>
            </Link>
            <Button variant="ghost" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="h-full rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <ArrowRight className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                Create Group
              </CardTitle>
              <CardDescription className="text-slate-600">
                Spin up a group to gather and share contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/groups/create">
                <Button className="w-full">Create Group</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <QrCode className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                Join Group
              </CardTitle>
              <CardDescription className="text-slate-600">
                Join an existing group using a QR code or invite code.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link href="/join" className="block">
                <Button variant="outline" className="w-full justify-center gap-2">
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  Scan QR
                </Button>
              </Link>
              <Link href="/join" className="block">
                <Button className="w-full justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Enter Code
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
                <Share2 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                My Groups
              </CardTitle>
              <CardDescription className="text-slate-600">
                Review and manage the groups you’ve created or joined.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupsLoading ? (
                <div className="space-y-2">
                  <div className="h-4 rounded bg-slate-200 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
                </div>
              ) : groupsError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Error loading groups: {groupsError.message}
                </div>
              ) : !groups || groups.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    No groups yet. Create your first group to get started.
                  </p>
                  <Link href="/groups/create">
                    <Button className="w-full">Create Group</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.slice(0, 3).map((group: DashboardGroup) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-3 py-2 shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {group.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {group.member_count} member{group.member_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/groups/${group.id}`}>
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Open group</span>
                          </Button>
                        </Link>
                        {group.is_owner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyShareLink(group.share_token)}
                          >
                            <Copy className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Copy share link</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {groups.length > 3 && (
                    <p className="text-xs text-slate-600">
                      +{groups.length - 3} more groups
                    </p>
                  )}
                  <Link href="/dashboard">
                    <Button variant="secondary" className="w-full">
                      View Dashboard
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
