import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAlertEmail } from '@/lib/resend'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Bird message status values that map to a terminal failure
const FAILED_STATUSES = new Set(['sending_failed', 'delivery_failed'])

// Bird message status values worth persisting to the DB
const TRACKED_STATUSES = new Set(['sent', 'delivered', 'sending_failed', 'delivery_failed'])

// Map Bird status values to the DB CHECK constraint values
// DB allows: 'pending' | 'sent' | 'delivered' | 'failed'
function toDbStatus(birdStatus: string): string {
  if (birdStatus === 'sending_failed' || birdStatus === 'delivery_failed') return 'failed'
  return birdStatus
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // TODO: Implement Bird webhook signature verification once the signing
  // secret format is confirmed from the Bird dashboard. For now we accept
  // all requests and rely on the obscurity of the endpoint URL.
  // Bird's webhook signing header and algorithm should be available under
  // Notifications → Webhooks → Signing in the Bird dashboard.
  console.log('Bird webhook received, headers:', Object.fromEntries(request.headers.entries()))

  let payload: BirdWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('Bird webhook: failed to parse body', rawBody)
    return new NextResponse('Bad Request', { status: 400 })
  }

  // Log full payload so we can inspect the real shape from Bird
  console.log('Bird webhook payload:', JSON.stringify(payload, null, 2))

  const messageId = payload?.data?.message?.id ?? payload?.data?.id
  const status = payload?.data?.message?.status ?? payload?.data?.status

  if (!messageId || !status) {
    console.log('Bird webhook: missing messageId or status, ignoring', payload)
    return new NextResponse(null, { status: 204 })
  }

  console.log(`Bird webhook: status=${status}`, { messageId })

  if (TRACKED_STATUSES.has(status)) {
    await updateSmsNotificationStatus(messageId, toDbStatus(status))
  }

  if (FAILED_STATUSES.has(status)) {
    const recipient = payload?.data?.message?.receiver?.contacts?.[0]?.identifierValue ?? null
    await handleMessageFailed({ messageId, status, to: recipient })
  }

  return new NextResponse(null, { status: 204 })
}

async function updateSmsNotificationStatus(messageId: string, status: string) {
  try {
    const { error } = await (supabaseAdmin as any)
      .from('sms_notifications')
      .update({ status })
      .eq('provider_message_id', messageId)

    if (error) {
      console.error('Failed to update sms_notifications status:', error)
    }
  } catch (err) {
    console.error('updateSmsNotificationStatus threw:', err)
  }
}

interface FailedMessageParams {
  messageId: string
  status: string
  to: string | null
}

async function handleMessageFailed({ messageId, status, to }: FailedMessageParams) {
  try {
    const safeStatus = escapeHtml(status)
    const safeId = escapeHtml(messageId)
    const safeRecipient = escapeHtml(to ?? 'unknown')

    const subject = `Bubbles: SMS/MMS delivery ${status}`
    const html = `
      <h2>SMS/MMS delivery failed</h2>
      <table>
        <tr><td><strong>Status</strong></td><td>${safeStatus}</td></tr>
        <tr><td><strong>Message ID</strong></td><td>${safeId}</td></tr>
        <tr><td><strong>Recipient</strong></td><td>${safeRecipient}</td></tr>
      </table>
    `
    await sendAlertEmail({ subject, html })
  } catch (err) {
    console.error('handleMessageFailed threw:', err)
  }
}

// Bird webhook payload — shape is partially speculative until we see a real sample.
// The console.log above will print the actual shape for the first delivery.
interface BirdWebhookPayload {
  type?: string
  data?: {
    id?: string
    status?: string
    message?: {
      id?: string
      status?: string
      receiver?: {
        contacts?: Array<{ identifierValue?: string }>
      }
    }
  }
}
