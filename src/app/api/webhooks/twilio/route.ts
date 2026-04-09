import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase'

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

  if (!messageSid) {
    console.error('Twilio webhook: missing MessageSid', params)
    return new NextResponse('Bad Request', { status: 400 })
  }

  if (!messageStatus) {
    // Inbound message webhook (e.g. someone replied to the SMS) — no status callback, ignore
    console.log('Twilio webhook: no MessageStatus, treating as inbound message', { messageSid })
    return new NextResponse(null, { status: 204 })
  }

  if (TRACKED_STATUSES.has(messageStatus)) {
    await updateSmsNotificationStatus(messageSid, messageStatus)
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

