import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

interface GroupMember {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string | null
}

const escapeVCardValue = (value?: string | null) => {
  if (!value) return ''
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim()
}

function generateVCard(member: GroupMember, groupName: string): string {
  const firstName = member.first_name?.trim() || ''
  const lastName = member.last_name?.trim() || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || member.email || 'Bubbles Member'
  const givenName = firstName || fullName

  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardValue(lastName)};${escapeVCardValue(givenName)};;;`,
    `FN:${escapeVCardValue(fullName)}`,
  ]

  if (member.email) vcard.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(member.email)}`)
  if (member.phone) {
    vcard.push(`TEL;TYPE=CELL:${escapeVCardValue(member.phone)}`)
  }

  if (member.avatar_url) {
    vcard.push(`PHOTO;VALUE=URI:${escapeVCardValue(member.avatar_url)}`)
  }

  vcard.push(`ORG:${escapeVCardValue(groupName)} | bubbles.fyi`)
  vcard.push(`NOTE:${escapeVCardValue(`Member of ${groupName} group from bubbles.fyi`)}`)
  vcard.push('END:VCARD')
  return vcard.join('\r\n')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params

  // Create server-side Supabase client from request cookies
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Fetch group info
  const { data: group, error: groupError } = await supabase
    .from('contact_groups')
    .select('name, owner_id')
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Fetch active members
  const { data: members, error: memberError } = await supabase
    .from('group_memberships')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .eq('group_id', groupId)
    .is('departed_at', null)
    .order('joined_at', { ascending: true })

  if (memberError || !members || members.length === 0) {
    return NextResponse.json({ error: 'No members found' }, { status: 404 })
  }

  const vcards = members.map((m) => generateVCard(m as GroupMember, group.name))
  const vcfContent = vcards.join('\r\n\r\n') + '\r\n'
  const filename = `${group.name.replace(/[^a-zA-Z0-9]/g, '_')}_contacts.vcf`

  return new NextResponse(vcfContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/x-vcard; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
