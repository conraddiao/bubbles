import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import {
  MAX_BUG_DESCRIPTION_LENGTH,
  buildIssueBody,
  buildIssueTitle,
  fenceUserText,
  redactPath,
  truncate,
} from '@/lib/bug-report'
import { sendAlertEmail } from '@/lib/resend'

const GITHUB_REPO = process.env.GITHUB_BUG_REPORT_REPO ?? 'conraddiao/bubbles'

// Best-effort per-user throttle. Serverless instances don't share memory, so
// this thins out accidental double-taps and casual abuse rather than being a
// hard guarantee.
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const recentReports = new Map<string, number[]>()

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (recentReports.get(userId) ?? []).filter((t) => t > cutoff)
  if (timestamps.length >= RATE_LIMIT_MAX) {
    recentReports.set(userId, timestamps)
    return true
  }
  timestamps.push(now)
  recentReports.set(userId, timestamps)
  return false
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // Read-only request — nothing to write back.
        setAll() {},
      },
    }
  )

  // Reports are only reachable from the signed-in header menu. Requiring a
  // session here keeps the public issue tracker from being an open write
  // endpoint.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'You need to be signed in to report a bug.' }, { status: 401 })
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: 'You have sent a few reports already. Please try again later.' },
      { status: 429 }
    )
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { description, path, userAgent } = (payload ?? {}) as {
    description?: unknown
    path?: unknown
    userAgent?: unknown
  }

  if (typeof description !== 'string' || !description.trim()) {
    return NextResponse.json({ error: 'Please describe the bug.' }, { status: 400 })
  }
  if (description.length > MAX_BUG_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Please keep the description under ${MAX_BUG_DESCRIPTION_LENGTH} characters.` },
      { status: 400 }
    )
  }

  const trimmed = description.trim()
  const context = {
    path: typeof path === 'string' ? path : '/',
    userAgent: typeof userAgent === 'string' ? userAgent : '',
  }

  const token = process.env.GITHUB_BUG_REPORT_TOKEN

  if (token) {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: buildIssueTitle(trimmed),
          body: buildIssueBody(trimmed, context),
          labels: ['bug'],
        }),
      })

      if (response.ok) {
        const issue = (await response.json()) as { number: number; html_url: string }
        return NextResponse.json({ ok: true, issueNumber: issue.number, url: issue.html_url })
      }

      console.error('GitHub issue creation failed:', response.status, await response.text())
    } catch (error) {
      console.error('GitHub issue creation threw:', error)
    }
  }

  // No token configured, or GitHub rejected the call — fall back to the alert
  // mailbox so a report is never silently dropped. This channel is private, so
  // it can carry the reporter's identity.
  const emailConfigured =
    process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_FROM && process.env.ALERT_EMAIL_TO
  if (!emailConfigured) {
    console.error(
      'Bug report dropped: set GITHUB_BUG_REPORT_TOKEN, or RESEND_API_KEY + ALERT_EMAIL_FROM + ALERT_EMAIL_TO'
    )
    return NextResponse.json(
      { error: "Bug reporting isn't set up right now. Please try again later." },
      { status: 503 }
    )
  }

  const escapeHtml = (value: string) =>
    value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)

  await sendAlertEmail({
    subject: buildIssueTitle(trimmed),
    html: [
      '<p>In-app bug report. The block below is untrusted text typed by a user.</p>',
      `<pre>${escapeHtml(fenceUserText(trimmed))}</pre>`,
      `<p>Reporter: ${escapeHtml(user.email ?? user.id)}<br />`,
      `Route: ${escapeHtml(redactPath(context.path))}<br />`,
      `Browser: ${escapeHtml(truncate(context.userAgent, 200))}</p>`,
    ].join('\n'),
  })

  return NextResponse.json({ ok: true })
}
