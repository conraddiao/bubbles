import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
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

// Terminal failure statuses per Twilio docs
const FAILED_STATUSES = new Set(['failed', 'undelivered'])

// Statuses worth persisting to the DB
const TRACKED_STATUSES = new Set(['sent', 'delivered', 'failed', 'undelivered'])

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.error('Twilio webhook: TWILIO_AUTH_TOKEN not configured')
    return new NextResponse('Server misconfiguration', { status: 500 })
  }

  const twilioSignature = request.headers.get('x-twilio-signature') ?? ''
  const appUrl = process.env.APP_URL ?? ''
  const webhookUrl = `${appUrl}/api/webhooks/twilio`

  // Twilio sends webhooks as application/x-www-form-urlencoded
  const formData = await request.formData()
  const params: Record<string, string> = {}
  formData.forEach((value, key) => {
    params[key] = value.toString()
  })

  const isValid = twilio.validateRequest(authToken, twilioSignature, webhookUrl, params)
  if (!isValid) {
    console.error('Twilio webhook: invalid signature')
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Twilio sends two webhook formats to this endpoint:
  // 1. Status callbacks: top-level MessageSid, MessageStatus, ErrorCode, To
  // 2. Debugger notifications: Level, Payload (JSON string with resource_sid, error_code), Sid (NO…)

  const messageSid = params['MessageSid']

  if (messageSid) {
    // ── Standard status callback ──
    const messageStatus = params['MessageStatus']
    const errorCode = params['ErrorCode'] ?? null
    const to = params['To'] ?? null

    if (!messageStatus) {
      console.log('Twilio webhook: no MessageStatus, treating as inbound message', { messageSid })
      return new NextResponse(null, { status: 204 })
    }

    if (TRACKED_STATUSES.has(messageStatus)) {
      await updateSmsNotificationStatus(messageSid, messageStatus)
    }

    if (FAILED_STATUSES.has(messageStatus)) {
      await handleMessageFailed({ messageSid, messageStatus, errorCode, to, authToken })
    }

    return new NextResponse(null, { status: 204 })
  }

  // ── Debugger error notification ──
  if (params['Level'] === 'ERROR' && params['Payload']) {
    try {
      const payload = JSON.parse(params['Payload']) as {
        resource_sid?: string
        error_code?: string
      }
      const resourceSid = payload.resource_sid
      const errorCode = payload.error_code ?? null

      if (resourceSid?.startsWith('SM')) {
        await handleMessageFailed({
          messageSid: resourceSid,
          messageStatus: 'failed',
          errorCode,
          to: null,
          authToken,
        })
        await updateSmsNotificationStatus(resourceSid, 'failed')
      }
    } catch (err) {
      console.error('Twilio webhook: failed to parse debugger Payload', err)
    }

    return new NextResponse(null, { status: 204 })
  }

  console.log('Twilio webhook: unrecognized payload, ignoring', Object.keys(params))
  return new NextResponse(null, { status: 204 })
}

async function updateSmsNotificationStatus(twilioSid: string, messageStatus: string) {
  try {
    // Normalize 'undelivered' to 'failed' — schema CHECK constraint only allows
    // ('pending', 'sent', 'delivered', 'failed')
    const status = messageStatus === 'undelivered' ? 'failed' : messageStatus

    const { error } = await (supabaseAdmin as any)
      .from('sms_notifications')
      .update({ status })
      .eq('twilio_sid', twilioSid)

    if (error) {
      console.error('Failed to update sms_notifications status:', error)
    }
  } catch (err) {
    console.error('updateSmsNotificationStatus threw:', err)
  }
}

interface FailedMessageParams {
  messageSid: string
  messageStatus: string
  errorCode: string | null
  to: string | null
  authToken: string
}

async function handleMessageFailed({ messageSid, messageStatus, errorCode, to, authToken }: FailedMessageParams) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID

    let messageBody: string | null = null
    let recipient = to
    if (accountSid) {
      try {
        const client = twilio(accountSid, authToken)
        const msg = await client.messages(messageSid).fetch()
        messageBody = msg.body ?? null
        if (!recipient) recipient = msg.to ?? null
      } catch (err) {
        console.error('Twilio webhook: failed to fetch message details', err)
      }
    }

    const safeStatus = escapeHtml(messageStatus)
    const safeSid = escapeHtml(messageSid)
    const safeRecipient = escapeHtml(recipient ?? 'unknown')

    const subject = `Bubbles: SMS/MMS delivery ${messageStatus}`
    const errorCodeRow = errorCode
      ? `<tr><td><strong>Error Code</strong></td><td><a href="https://www.twilio.com/docs/api/errors/${encodeURIComponent(errorCode)}">${escapeHtml(errorCode)}</a></td></tr>`
      : ''
    const bodyRow = messageBody != null
      ? `<tr><td><strong>Message Body</strong></td><td>${escapeHtml(messageBody)}</td></tr>`
      : ''
    const html = `
      <h2>SMS/MMS delivery failed</h2>
      <table>
        <tr><td><strong>Status</strong></td><td>${safeStatus}</td></tr>
        <tr><td><strong>Message SID</strong></td><td>${safeSid}</td></tr>
        <tr><td><strong>Recipient</strong></td><td>${safeRecipient}</td></tr>
        ${bodyRow}
        ${errorCodeRow}
      </table>
      <p><a href="https://console.twilio.com/us1/monitor/logs/sms/${encodeURIComponent(messageSid)}">View message in Twilio console</a></p>
    `
    await sendAlertEmail({ subject, html })
  } catch (err) {
    console.error('handleMessageFailed threw:', err)
  }
}

