import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Shared Contact Groups
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create and manage shared contact lists for events, gatherings, and group activities. 
            Make it easy for participants to connect with each other.
          </p>
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
              <Button className="w-full">Get Started</Button>
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
