import { redirect } from 'next/navigation'

interface JoinRedirectProps {
  params: Promise<{ token: string }>
}

export default async function JoinRedirect({ params }: JoinRedirectProps) {
  const { token } = await params
  redirect(`/group/${token}/join`)
}
