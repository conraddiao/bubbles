import Link from 'next/link'

export const metadata = {
  title: 'SMS Messaging Program — Bubbles',
  description:
    'How Bubbles uses SMS and MMS, how to opt in, and how to opt out.',
}

export default function MessagingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl animate-fade-up-in px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="font-label mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            SMS Program
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Messaging Program
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: May 3, 2026
          </p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              About Bubbles
            </h2>
            <p>
              Bubbles (<a href="https://www.bubbles.fyi" className="text-primary hover:underline">bubbles.fyi</a>) is a
              contact-sharing service for social events — weddings, parties, gatherings. A host creates a group, shares a
              QR code or link, and everyone who joins can download each other&rsquo;s contact info as a vCard. Bubbles is
              operated by Conrad Diao (<a href="mailto:conrad@bubbles.fyi" className="text-primary hover:underline">conrad@bubbles.fyi</a>).
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              Message Types
            </h2>
            <p className="mb-3">
              Bubbles sends two categories of messages from a verified toll-free number. No marketing or promotional
              messages are ever sent.
            </p>
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <strong className="text-foreground">Account verification (SMS) — required.</strong>{' '}
                One-time passcodes (OTP) sent when you sign in or confirm your phone number during account setup.
                These are transactional and cannot be disabled while using the service.
              </li>
              <li>
                <strong className="text-foreground">Contact cards (MMS) — optional, opt-in only.</strong>{' '}
                When a group you joined chooses to share its contact list, opted-in members receive a single MMS
                message containing a vCard (.vcf) attachment with the group&rsquo;s contacts. This is off by default
                and can be toggled from your profile settings at any time.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              How You Opt In
            </h2>
            <p className="mb-3">
              Consent is collected during account creation at{' '}
              <Link href="/onboarding/phone" className="text-primary hover:underline">
                bubbles.fyi/onboarding/phone
              </Link>
              . Before submitting their phone number, users see this disclosure:
            </p>
            <blockquote className="rounded-lg border border-border bg-[var(--surface)] px-5 py-4 italic text-foreground/70">
              &ldquo;By continuing, you agree to our Terms of Service and Privacy Policy, and consent to receive text
              messages from Bubbles — including verification codes and, if you opt in from your profile, MMS contact
              cards from groups you join. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out,
              HELP for help.&rdquo;
            </blockquote>
            <p className="mt-3">
              Consent is recorded in our database at the time of sign-up. Users may revoke MMS consent at any time from
              their profile settings, or by replying STOP.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              Sample Messages
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 font-medium text-foreground">Verification code (SMS):</p>
                <div className="rounded-lg border border-border bg-[var(--surface)] px-4 py-3 font-mono text-xs text-foreground">
                  Your Bubbles verification code is 847291. Valid for 10 minutes. Do not share this code.
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-foreground">Contact card share (MMS):</p>
                <div className="rounded-lg border border-border bg-[var(--surface)] px-4 py-3 font-mono text-xs text-foreground">
                  Book Club contacts from Bubbles — tap the attachment to add them to your contacts. Reply STOP to opt out.
                  <br />[vCard attachment: contacts.vcf]
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-foreground">Opt-in confirmation:</p>
                <div className="rounded-lg border border-border bg-[var(--surface)] px-4 py-3 font-mono text-xs text-foreground">
                  You&apos;re now opted into Bubbles group updates. Reply STOP to unsubscribe, HELP for help. Msg &amp; data rates may apply.
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-foreground">HELP response:</p>
                <div className="rounded-lg border border-border bg-[var(--surface)] px-4 py-3 font-mono text-xs text-foreground">
                  Bubbles: For support, visit bubbles.fyi or email conrad@bubbles.fyi. Reply STOP to unsubscribe. Msg &amp; data rates may apply.
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              Opting Out
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Reply <strong className="text-foreground">STOP</strong> to any message to unsubscribe from all
                non-required messages. You will receive a one-time confirmation and no further MMS messages will be sent.
              </li>
              <li>
                Reply <strong className="text-foreground">HELP</strong> to any message to receive support contact
                information.
              </li>
              <li>
                You can also disable MMS contact cards from your Bubbles profile settings at any time.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              Message Frequency &amp; Rates
            </h2>
            <p>
              Message frequency varies based on your activity. Verification codes are sent only when you sign in or
              create an account. MMS contact cards are sent only when a group host shares contacts, which is an
              infrequent, event-driven action. <strong className="text-foreground">Msg &amp; data rates may apply</strong> depending
              on your carrier plan.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              Contact &amp; Support
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Email:</strong>{' '}
                <a href="mailto:conrad@bubbles.fyi" className="text-primary hover:underline">
                  conrad@bubbles.fyi
                </a>
              </li>
              <li>
                <strong className="text-foreground">Website:</strong>{' '}
                <a href="https://www.bubbles.fyi" className="text-primary hover:underline">
                  www.bubbles.fyi
                </a>
              </li>
            </ul>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Bubbles
          </Link>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
