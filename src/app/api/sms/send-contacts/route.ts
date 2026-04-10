import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase'
import { generateMemberVCard, formatVCardRev, type VCardMember } from '@/lib/vcard'

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

  // Fetch group info
  const { data: groupData, error: groupError } = await supabaseAdmin
    .from('contact_groups')
    .select('name')
    .eq('id', groupId)
    .single()

  if (groupError || !groupData) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }
  const fetchedGroupName = (groupData as { name: string }).name

  // Fetch active members
  const { data: memberData, error: memberError } = await supabaseAdmin
    .from('group_memberships')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .eq('group_id', groupId)
    .is('departed_at', null)
    .order('joined_at', { ascending: true })

  if (memberError || !memberData || memberData.length === 0) {
    return NextResponse.json({ error: 'No members found' }, { status: 404 })
  }
  const members = memberData as unknown as VCardMember[]

  // Use one REV instant across every card in this export so the output
  // is internally consistent.
  const exportedAt = new Date()

  // Generate .vcf content — lead with a Bubbles contact card so users save
  // the sending number. A hard-coded UID lets iOS dedupe re-sends of the
  // sender card, matching the member cards' dedup behavior.
  const bubblesVCard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:;Bubbles;;;',
    'FN:Bubbles',
    'UID:urn:bubbles:service:sender',
    `REV:${formatVCardRev(exportedAt)}`,
    `TEL;TYPE=CELL:${fromNumber}`,
    'URL:https://bubbles.fyi',
    'ORG:bubbles.fyi',
    'NOTE:Bubbles — shared contact groups. https://bubbles.fyi',
    'END:VCARD',
  ].join('\r\n')

  const memberVCards = members
    .map((m) => generateMemberVCard(m, fetchedGroupName, exportedAt))
    .join('\r\n\r\n')
  const vcfContent = bubblesVCard + '\r\n\r\n' + memberVCards + '\r\n'
  const filename = `${groupId}/${Date.now()}.vcf`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from('vcards')
    .upload(filename, vcfContent, {
      contentType: 'text/vcard',
      upsert: true,
    })

  if (uploadError) {
    console.error('vCard upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to generate contact file' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('vcards')
    .getPublicUrl(filename)

  // In development, override the recipient to a test phone number
  let recipient = to
  if (process.env.NODE_ENV === 'development' && process.env.TWILIO_TEST_RECIPIENT_PHONE) {
    console.warn(`[DEV] Overriding SMS recipient from ${to} to ${process.env.TWILIO_TEST_RECIPIENT_PHONE}`)
    recipient = process.env.TWILIO_TEST_RECIPIENT_PHONE
  }

  const client = twilio(accountSid, authToken)

  try {
    const message = await client.messages.create({
      to: recipient,
      from: fromNumber,
      body: `${groupName || 'Your group'} contacts from Bubbles — tap the attachment to add them to your phone.`,
      mediaUrl: [publicUrl],
      statusCallback: `${process.env.APP_URL}/api/webhooks/twilio`,
    })

    const { error: insertError } = await (supabaseAdmin as any)
      .from('sms_notifications')
      .insert({
        recipient_phone: recipient,
        message_type: 'member_notification',
        twilio_sid: message.sid,
        status: 'sent',
        group_id: groupId,
      })

    if (insertError) {
      console.error('Failed to insert sms_notifications record:', insertError)
    }

    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      status: message.status,
      vcfUrl: publicUrl,
    })
  } catch (error) {
    console.error('Twilio MMS error:', error)
    const message = error instanceof Error ? error.message : 'Failed to send MMS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
