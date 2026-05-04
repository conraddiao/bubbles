import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Bubbles',
}

export default function MessagingPrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="space-y-0">
          <Image
            src="/messaging/privacy-policy-1.png"
            alt="Privacy Policy page 1"
            width={800}
            height={1100}
            className="w-full"
            priority
          />
          <Image
            src="/messaging/privacy-policy-2.png"
            alt="Privacy Policy page 2"
            width={800}
            height={1100}
            className="w-full"
          />
        </div>

        <footer className="mt-8 border-t border-border pt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/messaging" className="text-primary hover:underline">
            ← Back to Bubbles
          </Link>
          <Link href="/messaging/terms-of-service" className="hover:text-foreground hover:underline">
            Terms of Service
          </Link>
        </footer>
      </main>
    </div>
  )
}
