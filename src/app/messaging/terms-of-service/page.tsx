import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Bubbles',
}

export default function MessagingTermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="space-y-0">
          <Image
            src="/messaging/terms-1.png"
            alt="Terms of Service page 1"
            width={800}
            height={1100}
            className="w-full"
            priority
          />
          <Image
            src="/messaging/terms-2.png"
            alt="Terms of Service page 2"
            width={800}
            height={1100}
            className="w-full"
          />
        </div>

        <footer className="mt-8 border-t border-border pt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/messaging" className="text-primary hover:underline">
            ← Back to Bubbles
          </Link>
          <Link href="/messaging/privacy-policy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
        </footer>
      </main>
    </div>
  )
}
