import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateBulkVCard, type VCardMember } from '@/lib/vcard'

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

  const vcfContent = generateBulkVCard(members as VCardMember[], group.name)
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
