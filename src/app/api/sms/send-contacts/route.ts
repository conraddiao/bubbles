import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { error: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.local' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const { to, groupId, groupName } = body as {
    to: string
    groupId: string
    groupName?: string
  }

  if (!to || !groupId) {
    return NextResponse.json(
      { error: 'Missing required fields: to (phone number), groupId' },
      { status: 400 }
    )
  }

  // Build the public URL for the .vcf file
  // Twilio fetches this URL to attach the file to the MMS
  const origin = request.headers.get('origin')
    || request.headers.get('x-forwarded-host')
    || new URL(request.url).origin
  const vcfUrl = `${origin.startsWith('http') ? origin : `https://${origin}`}/api/groups/${groupId}/contacts.vcf`

  const client = twilio(accountSid, authToken)

  try {
    const message = await client.messages.create({
      to,
      from: fromNumber,
      body: `${groupName || 'Your group'} contacts from Bubbles — tap the attachment to add them to your phone.`,
      mediaUrl: [vcfUrl],
    })

    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      status: message.status,
      vcfUrl,
    })
  } catch (error) {
    console.error('Twilio MMS error:', error)
    const message = error instanceof Error ? error.message : 'Failed to send MMS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
