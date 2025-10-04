'use client'

import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from '@/hooks/use-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header with auth buttons */}
        <div className="flex justify-between items-center mb-16">
          <div className="text-left">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Shared Contact Groups
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
              Create and manage shared contact lists for events, gatherings, and group activities. 
              Make it easy for participants to connect with each other.
            </p>
          </div>
          
          <div className="flex gap-2">
            {!loading && (
              user ? (
                <Link href="/dashboard">
                  <Button>Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth?mode=signin">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link href="/auth?mode=signup">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create Groups</CardTitle>
              <CardDescription>
                Set up contact groups for your events with shareable forms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={user ? "/dashboard" : "/auth?mode=signup"}>
                <Button className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join Groups</CardTitle>
              <CardDescription>
                Easily join contact groups and share your information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">Join a Group</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Contacts</CardTitle>
              <CardDescription>
                Download contact information in standard formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">Learn More</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built with Next.js 14, Supabase, and shadcn/ui
          </p>
        </div>
      </div>
    </div>
  )
}
