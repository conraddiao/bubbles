import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    console.error('Twilio events webhook: TWILIO_AUTH_TOKEN not configured')
    return new NextResponse('Server misconfiguration', { status: 500 })
  }

  const rawBody = await request.text()
  const twilioSignature = request.headers.get('x-twilio-signature') ?? ''
  const appUrl = process.env.APP_URL ?? ''
  // Event Streams sig validation uses the full URL including any query params
  const search = request.nextUrl.search ?? ''
  const webhookUrl = `${appUrl}/api/webhooks/twilio/events${search}`

  const isValid = twilio.validateRequestWithBody(authToken, twilioSignature, webhookUrl, rawBody)
  if (!isValid) {
    console.error('Twilio events webhook: invalid signature')
    return new NextResponse('Forbidden', { status: 403 })
  }

  let events: CloudEvent[]
  try {
    events = JSON.parse(rawBody)
    if (!Array.isArray(events)) events = [events]
  } catch {
    console.error('Twilio events webhook: failed to parse body', rawBody)
    return new NextResponse('Bad Request', { status: 400 })
  }

  for (const event of events) {
    await handleEvent(event)
  }

  return new NextResponse(null, { status: 204 })
}

interface CloudEvent {
  specversion: string
  type: string
  source: string
  id: string
  time: string
  dataschema?: string
  datacontenttype?: string
  data: string | Record<string, unknown>
}

interface MessageStatusData {
  AccountSid?: string
  MessageSid?: string
  SmsSid?: string
  From?: string
  To?: string
  Body?: string
  Status?: string
  ErrorCode?: string
  ErrorMessage?: string
  MessagingServiceSid?: string
  [key: string]: unknown
}

async function handleEvent(event: CloudEvent) {
  const { type } = event
  if (!type.startsWith('com.twilio.messaging.message.')) return

  let data: MessageStatusData = {}
  try {
    data = typeof event.data === 'string' ? JSON.parse(event.data) : (event.data as MessageStatusData)
  } catch {
    console.error('Twilio events webhook: failed to parse event data', event)
    return
  }

  const status = type.split('.').pop() ?? 'unknown' // sent, delivered, failed, undelivered
  const messageSid = data.MessageSid ?? data.SmsSid ?? 'unknown'
  const to = data.To ?? 'unknown'

  // Alert email is sent by the standard status callback webhook (route.ts).
  // This handler just logs for observability.
  console.log(`Twilio event: ${type}`, { messageSid, to, status })
}
