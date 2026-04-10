import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CheckEmailPageProps {
  searchParams?: Promise<{ email?: string }>
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = await searchParams
  const email = params?.email ? decodeURIComponent(params.email) : null

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link{email ? ` to ${email}` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Click the link in the email to confirm your account. You can close this tab once it’s
            confirmed.
          </p>
          <Button asChild className="w-full">
            <Link href="/auth?mode=signin">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
