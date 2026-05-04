import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateMemberVCard, formatVCardRev, type VCardMember } from '@/lib/vcard'

export async function POST(request: NextRequest) {
  const accessKey = process.env.BIRD_ACCESS_KEY
  const workspaceId = process.env.BIRD_WORKSPACE_ID
  const channelId = process.env.BIRD_CHANNEL_ID
  const fromNumber = process.env.BIRD_PHONE_NUMBER

  if (!accessKey || !workspaceId || !channelId || !fromNumber) {
    return NextResponse.json(
      { error: 'Bird credentials not configured. Set BIRD_ACCESS_KEY, BIRD_WORKSPACE_ID, BIRD_CHANNEL_ID, and BIRD_PHONE_NUMBER in .env.local' },
      { status: 500 }
    )
  }

  const body = await request.json()
  const { to, groupId, groupName, memberIds } = body as {
    to: string
    groupId: string
    groupName?: string
    memberIds?: string[]
  }

  if (!to || !groupId) {
    return NextResponse.json(
      { error: 'Missing required fields: to (phone number), groupId' },
      { status: 400 }
    )
  }

  // Optional subset filter. If the client sent memberIds at all, require at
  // least one valid id so a client bug can't silently fall through to "send
  // everyone" when a filtered send was intended.
  const filterIds = Array.isArray(memberIds)
    ? memberIds.filter((id) => typeof id === 'string' && id.length > 0)
    : undefined
  if (memberIds !== undefined && (!filterIds || filterIds.length === 0)) {
    return NextResponse.json(
      { error: 'memberIds must contain at least one id' },
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

  // Fetch active members (optionally filtered to a selected subset). The
  // .eq('group_id', ...) + .is('departed_at', null) stay AND-ed with the id
  // filter, which is what prevents cross-group id injection — passing ids
  // from another group will simply hit the "No members found" path below.
  let memberQuery = supabaseAdmin
    .from('group_memberships')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .eq('group_id', groupId)
    .is('departed_at', null)
  if (filterIds && filterIds.length > 0) {
    memberQuery = memberQuery.in('id', filterIds)
  }
  const { data: memberData, error: memberError } = await memberQuery
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
  if (process.env.NODE_ENV === 'development' && process.env.SMS_TEST_RECIPIENT_PHONE) {
    console.warn(`[DEV] Overriding SMS recipient from ${to} to ${process.env.SMS_TEST_RECIPIENT_PHONE}`)
    recipient = process.env.SMS_TEST_RECIPIENT_PHONE
  }

  try {
    const response = await fetch(
      `https://api.bird.com/workspaces/${workspaceId}/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${accessKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver: {
            contacts: [{ identifierValue: recipient }],
          },
          body: {
            type: 'file',
            file: {
              files: [{ mediaUrl: publicUrl, contentType: 'text/vcard' }],
              text: `${groupName || 'Your group'} contacts from Bubbles — tap the attachment to add them to your phone.`,
            },
          },
        }),
      }
    )

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Bird MMS error:', response.status, errBody)
      return NextResponse.json({ error: 'Failed to send MMS' }, { status: 500 })
    }

    const message = await response.json() as { id: string; [key: string]: unknown }

    const { error: insertError } = await (supabaseAdmin as any)
      .from('sms_notifications')
      .insert({
        recipient_phone: recipient,
        message_type: 'member_notification',
        provider_message_id: message.id,
        status: 'sent',
        group_id: groupId,
      })

    if (insertError) {
      console.error('Failed to insert sms_notifications record:', insertError)
    }

    return NextResponse.json({
      success: true,
      messageId: message.id,
      vcfUrl: publicUrl,
    })
  } catch (error) {
    console.error('Bird MMS error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to send MMS'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
