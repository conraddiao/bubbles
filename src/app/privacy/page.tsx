import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Bubbles',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl animate-fade-up-in px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="font-label mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Legal
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2, 2026</p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              1. Overview
            </h2>
            <p>
              Bubbles (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates a
              shared contact-group service that lets people swap contact information at
              gatherings by scanning a QR code. This Privacy Policy explains what personal
              information we collect, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              2. Information We Collect
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Name</strong> — your display name, as
                entered during sign-up or profile setup.
              </li>
              <li>
                <strong className="text-foreground">Email address</strong> — used for account
                authentication and transactional notifications.
              </li>
              <li>
                <strong className="text-foreground">Phone number</strong> — collected when you
                add it to your profile. Used to send SMS/MMS messages on your behalf (e.g.,
                group join confirmations) and to include in vCard contact exports shared with
                other group members at your direction.
              </li>
              <li>
                <strong className="text-foreground">Contact card (vCard) data</strong> — any
                additional contact details you optionally add (e.g., social handles, job
                title) that you choose to share with group members.
              </li>
              <li>
                <strong className="text-foreground">Usage data</strong> — basic analytics such
                as page views and feature interactions, collected in aggregate and not tied to
                your identity.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              3. SMS / MMS Messaging
            </h2>
            <p className="mb-3">
              By providing your phone number and completing sign-up, you expressly consent to
              receive SMS and MMS messages from Bubbles. These messages are event-driven and
              may include:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Group join confirmations and contact-share notifications</li>
              <li>One-time verification codes for phone number confirmation</li>
              <li>
                Occasional service-related updates (e.g., security alerts, policy changes)
              </li>
            </ul>
            <p className="mt-3">
              <strong className="text-foreground">Message frequency:</strong> Messages are sent
              only in response to actions you take. We do not send unsolicited marketing
              messages.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">Message and data rates may apply</strong>{' '}
              depending on your carrier plan.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">To opt out:</strong> Reply{' '}
              <strong className="text-foreground">STOP</strong> to any message at any time.
              You will receive a one-time confirmation and no further messages will be sent.
            </p>
            <p className="mt-3">
              <strong className="text-foreground">For help:</strong> Reply{' '}
              <strong className="text-foreground">HELP</strong> to any message or email us at{' '}
              <a
                href="mailto:hello@usebubbles.app"
                className="text-primary hover:underline"
              >
                hello@usebubbles.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              4. How We Use Your Information
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To provide and operate the Bubbles service</li>
              <li>
                To deliver SMS/MMS notifications you have consented to receive
              </li>
              <li>
                To share your contact card with other group members — only when you
                explicitly join a group
              </li>
              <li>To verify your identity and secure your account</li>
              <li>To improve service reliability and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              5. Sharing of Information
            </h2>
            <p className="mb-3">
              We do <strong className="text-foreground">not</strong> sell, rent, or trade your
              personal information to third parties.
            </p>
            <p>We may share data only in these limited circumstances:</p>
            <ul className="list-disc mt-3 space-y-2 pl-5">
              <li>
                <strong className="text-foreground">With other group members</strong> — your
                contact card is shared only with people in groups you joined voluntarily.
              </li>
              <li>
                <strong className="text-foreground">Service providers</strong> — we use
                infrastructure providers (e.g., Supabase for database, Twilio or similar for
                SMS) that process data solely on our behalf under data processing agreements.
              </li>
              <li>
                <strong className="text-foreground">Legal compliance</strong> — if required by
                law, court order, or to protect the safety of users or the public.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              6. Data Retention &amp; Deletion
            </h2>
            <p>
              We retain your data for as long as your account is active. You may delete your
              account and associated data at any time from your profile settings. Upon deletion,
              your personal information is removed from active systems within 30 days, except
              where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              7. Security
            </h2>
            <p>
              We use industry-standard security measures, including encrypted connections
              (TLS/HTTPS) and access controls, to protect your information. No method of
              transmission over the internet is 100% secure, but we take reasonable precautions
              to protect your data.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              8. Children&apos;s Privacy
            </h2>
            <p>
              Bubbles is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided us
              information, please contact us and we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              material changes by posting the updated policy on this page with a new effective
              date. Continued use of Bubbles after changes constitutes acceptance of the updated
              policy.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              10. Contact Us
            </h2>
            <p>
              For privacy questions, requests to access or delete your data, or to opt out of
              messaging, contact us at:{' '}
              <a href="mailto:hello@usebubbles.app" className="text-primary hover:underline">
                hello@usebubbles.app
              </a>
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Bubbles
          </Link>
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms of Service
          </Link>
        </footer>
      </main>
    </div>
  )
}
