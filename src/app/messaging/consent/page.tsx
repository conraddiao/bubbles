import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Consent During Onboarding — Bubbles',
}

export default function MessagingConsentPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Image
          src="/messaging/consent-onboarding.png"
          alt="Consent during onboarding"
          width={1024}
          height={900}
          className="w-full"
          priority
        />

        <footer className="mt-8 border-t border-border pt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/messaging" className="text-primary hover:underline">
            ← Back to Bubbles
          </Link>
          <div className="flex gap-4">
            <Link href="/messaging/privacy-policy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <Link href="/messaging/terms-of-service" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
