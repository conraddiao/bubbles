import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Bubbles',
}

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-2xl animate-fade-up-in px-4 py-12 sm:px-6">
        <header className="mb-10">
          <p className="font-label mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Legal
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2, 2026</p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Bubbles (&ldquo;the Service&rdquo;), you agree to be bound
              by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, please do
              not use the Service. These Terms constitute a binding legal agreement between you
              and Bubbles.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p>
              Bubbles is a shared contact-group platform that enables groups of people to
              exchange contact information at in-person events by scanning a QR code. Members
              of a group can opt in to share their contact card (vCard) with other members and
              may receive SMS/MMS messages related to group activity.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              3. Eligibility
            </h2>
            <p>
              You must be at least 13 years of age to use Bubbles. By creating an account, you
              represent that you meet this age requirement and that all information you provide
              is accurate and truthful.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              4. SMS / MMS Consent &amp; Messaging Terms
            </h2>
            <p className="mb-3">
              By providing your phone number during account creation or profile setup, you
              expressly consent to receive SMS and MMS messages from Bubbles.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Message types:</strong> Group join
                confirmations, contact-share notifications, phone number verification codes, and
                service-related alerts.
              </li>
              <li>
                <strong className="text-foreground">Message frequency:</strong> Messages are
                event-driven and sent only in response to actions you or other group members
                take. We do not send unsolicited marketing or promotional messages.
              </li>
              <li>
                <strong className="text-foreground">Message &amp; data rates:</strong> Standard
                message and data rates may apply depending on your mobile carrier and plan.
              </li>
              <li>
                <strong className="text-foreground">To stop:</strong> Reply{' '}
                <strong className="text-foreground">STOP</strong> to any message to opt out of
                all future messages. You will receive a single confirmation message and no
                further messages will be sent.
              </li>
              <li>
                <strong className="text-foreground">For help:</strong> Reply{' '}
                <strong className="text-foreground">HELP</strong> to any message or contact us
                at{' '}
                <a href="mailto:hello@bubbles.fyi" className="text-primary hover:underline">
                  hello@bubbles.fyi
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              5. User Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account
              credentials and for all activity that occurs under your account. Notify us
              immediately if you suspect unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              6. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to use Bubbles to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Send spam or unsolicited messages to other users</li>
              <li>Harass, threaten, or harm other users</li>
              <li>
                Collect or harvest other users&rsquo; contact information without their
                consent
              </li>
              <li>
                Impersonate any person or entity or provide false information
              </li>
              <li>
                Violate any applicable laws, including laws governing electronic communications
              </li>
              <li>
                Interfere with or disrupt the Service or servers connected to the Service
              </li>
              <li>
                Attempt to gain unauthorized access to any portion of the Service
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              7. Contact Sharing
            </h2>
            <p>
              When you join a group, your contact card is shared with other members of that
              group. By joining, you consent to this sharing. You are solely responsible for
              the information you include in your contact card. Do not include sensitive
              personal information that you do not wish to share publicly within a group.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              8. Intellectual Property
            </h2>
            <p>
              The Bubbles name, logo, and all related materials are the property of Bubbles.
              You retain ownership of the contact information and content you provide. By using
              the Service, you grant us a limited license to store and transmit your content
              solely as necessary to operate the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              9. Disclaimers
            </h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;
              WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT
              LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
              NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              ERROR-FREE, OR SECURE.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              10. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BUBBLES SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF
              OR RELATING TO YOUR USE OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM SHALL NOT
              EXCEED THE GREATER OF $100 OR THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              11. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for
              violation of these Terms or for any other reason at our discretion. You may
              delete your account at any time from your profile settings. Upon termination,
              your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              12. Changes to Terms
            </h2>
            <p>
              We may modify these Terms at any time. We will notify you of material changes by
              updating the effective date above. Continued use of the Service after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              13. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of the State of California, without regard
              to its conflict-of-law provisions. Any disputes shall be resolved in the courts
              located in San Francisco County, California.
            </p>
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold text-foreground">
              14. Contact
            </h2>
            <p>
              Questions about these Terms? Contact us at:{' '}
              <a href="mailto:hello@bubbles.fyi" className="text-primary hover:underline">
                hello@bubbles.fyi
              </a>
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-border pt-6 flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            ← Back to Bubbles
          </Link>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
        </footer>
      </main>
    </div>
  )
}
