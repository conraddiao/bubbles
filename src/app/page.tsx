import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { AuthRedirect } from '@/components/auth-redirect'
import { mmsOnboarding, showLandingPageCopy } from '@/flags'

export default async function Home() {
  const isMmsOnboarding = await mmsOnboarding()
  const showCopy = await showLandingPageCopy()

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Bubbles
          </h1>
          <p className="mt-4 text-xl leading-relaxed text-muted-foreground sm:text-2xl">
            The easiest way to swap contacts in a group.
          </p>
        </header>

        {showCopy && (
          <div className="mb-10 space-y-4 text-center text-base text-foreground/80">
            <p>
              New group chats w/ randoms, park hangs, weddings, that friend-of-a-friend dinner
              where everyone clicked. <strong className="text-foreground">Bubbles</strong> lets
              the whole group share contact info in seconds.
            </p>
            <p className="text-sm text-muted-foreground">
              Flash a QR code or share a link. Everyone joins and can download everyone&rsquo;s contact info.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {isMmsOnboarding ? (
            <Link href="/onboarding/phone" className="block">
              <Button className="w-full" size="lg">
                Get Started
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/auth?mode=signup" className="block">
                <Button className="w-full" size="lg">
                  Get Started
                </Button>
              </Link>
              <Link href="/auth?mode=signin" className="block">
                <Button variant="outline" className="w-full" size="lg">
                  Log In
                </Button>
              </Link>
            </>
          )}
        </div>

        <footer className="mt-10 text-center">
          <p className="font-label text-xs uppercase tracking-widest text-muted-foreground">
            QR --&gt; VCF
          </p>
          <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>

      <section
        id="sms-program"
        aria-labelledby="sms-program-heading"
        className="border-t border-border bg-[var(--surface)]"
      >
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="font-label mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            SMS program
          </p>
          <h2 id="sms-program-heading" className="font-display text-2xl font-bold sm:text-3xl">
            Texts from Bubbles
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/80">
            Bubbles sends two kinds of messages from a verified toll-free number:
          </p>
          <ul className="mt-4 space-y-3 text-base leading-relaxed text-foreground/80">
            <li>
              <strong className="text-foreground">Account verification (SMS).</strong>{' '}
              One-time codes when you sign in or confirm your phone number. Required to use the
              product.
            </li>
            <li>
              <strong className="text-foreground">Contact cards (MMS).</strong> When a group you
              joined shares its contacts, you receive an MMS with a vCard you can save to your
              phone. Opt-in, off by default.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Opt in at signup or from your profile. Reply <strong className="text-foreground">STOP</strong>{' '}
            to any message to opt out, or <strong className="text-foreground">HELP</strong> for
            support. Msg frequency varies; msg &amp; data rates may apply. See our{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{' '}
            for full details.
          </p>
        </div>
      </section>

      <AuthRedirect mmsOnboarding={isMmsOnboarding} />
    </div>
  )
}
