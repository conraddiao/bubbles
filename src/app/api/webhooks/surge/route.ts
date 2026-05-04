import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
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

// Surge sends webhooks with HMAC-SHA256 signature in the Surge-Signature header.
// Header format: "t=<unix_timestamp>,v1=<hex_hash>"
function validateSurgeSignature(secret: string, rawBody: string, signatureHeader: string): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('=') as [string, string])
  )
  const timestamp = parts['t']
  const receivedHash = parts['v1']
  if (!timestamp || !receivedHash) return false

  // Reject replays older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (age > 300) return false

  const payload = `${timestamp}.${rawBody}`
  const expectedHash = createHmac('sha256', secret).update(payload).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(receivedHash, 'hex'))
  } catch {
    return false
  }
}

const FAILED_STATUSES = new Set(['message.failed'])
const TRACKED_STATUSES = new Set(['message.sent', 'message.delivered', 'message.failed'])

// Surge normalizes event type to DB status
function eventTypeToStatus(eventType: string): string {
  switch (eventType) {
    case 'message.sent': return 'sent'
    case 'message.delivered': return 'delivered'
    case 'message.failed': return 'failed'
    default: return eventType
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.SURGE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Surge webhook: SURGE_WEBHOOK_SECRET not configured')
    return new NextResponse('Server misconfiguration', { status: 500 })
  }

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('surge-signature') ?? ''

  if (!validateSurgeSignature(webhookSecret, rawBody, signatureHeader)) {
    console.error('Surge webhook: invalid signature')
    return new NextResponse('Forbidden', { status: 403 })
  }

  let payload: SurgeWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('Surge webhook: failed to parse body', rawBody)
    return new NextResponse('Bad Request', { status: 400 })
  }

  const { event, data } = payload
  if (!event || !data) {
    console.log('Surge webhook: missing event or data, ignoring')
    return new NextResponse(null, { status: 204 })
  }

  console.log(`Surge webhook: ${event}`, { messageId: data.id, to: data.conversation?.contact?.phone_number })

  if (!TRACKED_STATUSES.has(event)) {
    return new NextResponse(null, { status: 204 })
  }

  const status = eventTypeToStatus(event)
  await updateSmsNotificationStatus(data.id, status)

  if (FAILED_STATUSES.has(event)) {
    await handleMessageFailed({ messageId: data.id, status, to: data.conversation?.contact?.phone_number ?? null, body: data.body ?? null })
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
  body: string | null
}

async function handleMessageFailed({ messageId, status, to, body: messageBody }: FailedMessageParams) {
  try {
    const safeStatus = escapeHtml(status)
    const safeId = escapeHtml(messageId)
    const safeRecipient = escapeHtml(to ?? 'unknown')

    const subject = `Bubbles: SMS/MMS delivery ${status}`
    const bodyRow = messageBody != null
      ? `<tr><td><strong>Message Body</strong></td><td>${escapeHtml(messageBody)}</td></tr>`
      : ''
    const html = `
      <h2>SMS/MMS delivery failed</h2>
      <table>
        <tr><td><strong>Status</strong></td><td>${safeStatus}</td></tr>
        <tr><td><strong>Message ID</strong></td><td>${safeId}</td></tr>
        <tr><td><strong>Recipient</strong></td><td>${safeRecipient}</td></tr>
        ${bodyRow}
      </table>
    `
    await sendAlertEmail({ subject, html })
  } catch (err) {
    console.error('handleMessageFailed threw:', err)
  }
}

// Surge webhook payload shape (partial — only fields we use)
interface SurgeWebhookPayload {
  event: string
  data: {
    id: string
    body?: string
    conversation?: {
      contact?: {
        phone_number?: string
      }
    }
  }
}
