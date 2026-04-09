import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase'
import { sendAlertEmail } from '@/lib/resend'

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

  const messageSid = params['MessageSid']
  const messageStatus = params['MessageStatus']
  const errorCode = params['ErrorCode'] ?? null
  const to = params['To'] ?? null

  if (!messageSid || !messageStatus) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (TRACKED_STATUSES.has(messageStatus)) {
    await updateSmsNotificationStatus(messageSid, messageStatus)
  }

  if (FAILED_STATUSES.has(messageStatus)) {
    await handleMessageFailed({ messageSid, messageStatus, errorCode, to })
  }

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
}

async function handleMessageFailed({ messageSid, messageStatus, errorCode, to }: FailedMessageParams) {
  try {
    const subject = `Bubbles: SMS/MMS delivery ${messageStatus}`
    const errorCodeRow = errorCode
      ? `<tr><td><strong>Error Code</strong></td><td><a href="https://www.twilio.com/docs/api/errors/${errorCode}">${errorCode}</a></td></tr>`
      : ''
    const html = `
      <h2>SMS/MMS delivery failed</h2>
      <table>
        <tr><td><strong>Status</strong></td><td>${messageStatus}</td></tr>
        <tr><td><strong>Message SID</strong></td><td>${messageSid}</td></tr>
        <tr><td><strong>Recipient</strong></td><td>${to ?? 'unknown'}</td></tr>
        ${errorCodeRow}
      </table>
      <p><a href="https://console.twilio.com/us1/monitor/logs/sms">View in Twilio console</a></p>
    `
    await sendAlertEmail({ subject, html })
  } catch (err) {
    console.error('handleMessageFailed threw:', err)
  }
}
