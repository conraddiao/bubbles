import { supabase, handleDatabaseError } from './supabase'
import type { Database, Profile } from '@/types'

type ContactGroupRow = Database['public']['Tables']['contact_groups']['Row']
type GroupMembershipLookup = Pick<Database['public']['Tables']['group_memberships']['Row'], 'id' | 'departed_at'>
const supabaseClient = supabase as any
type AccessType = ContactGroupRow['access_type']

// Type assertion for RPC calls until database functions are deployed
const rpc = (client: typeof supabase) => ({
  createContactGroup: (args: { group_name: string; group_description?: string }) =>
    client.rpc('create_contact_group' as any, args as any),
  joinContactGroup: (args: { group_token: string; enable_notifications?: boolean }) =>
    client.rpc('join_contact_group' as any, args as any),
  joinContactGroupAnonymous: (args: {
    group_token: string
    member_first_name: string
    member_last_name: string
    member_email: string
    member_phone?: string
    enable_notifications?: boolean
  }) => client.rpc('join_contact_group_anonymous' as any, args as any),
  removeGroupMember: (args: { membership_uuid: string }) =>
    client.rpc('remove_group_member' as any, args as any),
  closeContactGroup: (args: { group_uuid: string }) =>
    client.rpc('close_contact_group' as any, args as any),
  getGroupMembers: (args: { group_uuid: string }) =>
    client.rpc('get_group_members' as any, args as any),
  updateProfileAcrossGroups: (args: {
    new_first_name?: string
    new_last_name?: string
    new_phone?: string
    new_avatar_url?: string | null
  }) =>
    client.rpc('update_profile_across_groups' as any, args as any),
  regenerateGroupToken: (args: { group_uuid: string }) =>
    client.rpc('regenerate_group_token' as any, args as any),
})

async function hashPasscode(passcode: string) {
  const normalized = passcode.trim()
  const subtle = globalThis.crypto?.subtle

  if (!subtle) {
    throw new Error('Secure hashing is not available in this environment')
  }

  const encoded = new TextEncoder().encode(normalized)
  const digest = await subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function ensureValidPasscode(group: ContactGroupRow, passcode?: string) {
  if (group.access_type !== 'password') {
    return
  }

  if (!group.join_password_hash) {
    throw new Error('This group requires a password but none is configured yet.')
  }

  if (!passcode) {
    throw new Error('A group password is required to join this group.')
  }

  const providedHash = await hashPasscode(passcode)

  if (providedHash !== group.join_password_hash) {
    throw new Error('Incorrect group password.')
  }
}

// Group management functions
export async function createContactGroup(name: string, description?: string) {
  try {
    const { data, error } = await rpc(supabase).createContactGroup({
      group_name: name,
      group_description: description
    })

    if (error) throw error
    const result = data as { group_id?: string; share_token?: string } | null

    if (!result?.group_id || !result.share_token) {
      throw new Error('Invalid response from create_contact_group')
    }

    // The function now returns JSON with both group_id and share_token
    return {
      data: {
        group_id: result.group_id,
        share_token: result.share_token
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function joinContactGroup(
  shareToken: string,
  enableNotifications = false,
  groupPassword?: string
) {
  try {
    console.log('Authenticated user joining group:', { shareToken, enableNotifications })

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const profile = profileData as Profile | null

    if (!profile) throw new Error('User profile not found. Please complete your profile first.')
    const normalizedEmail = profile.email.toLowerCase().trim()

    // Find the group by share token
    const { data: groupData, error: groupError } = await supabase
      .from('contact_groups')
      .select('id,name,is_closed,access_type,join_password_hash')
      .eq('share_token', shareToken)
      .single()

    const group = groupData as ContactGroupRow | null

    if (groupError) {
      console.error('Group lookup error:', groupError)
      throw new Error('Invalid group link or group not found.')
    }

    if (!group) {
      throw new Error('Invalid group link or group not found.')
    }

    if (group.is_closed) {
      throw new Error('This group is closed and no longer accepting new members.')
    }

    await ensureValidPasscode(group, groupPassword)

    // Check if user is already a member (by user id or email)
    const { data: existingMemberByUserRaw, error: memberByUserError } = await supabase
      .from('group_memberships')
      .select('id,departed_at')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberByUserError) {
      throw memberByUserError
    }

    // Add user to group
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.full_name

    const { data: membership, error: memberError } = await supabaseClient
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: user.id,
        first_name: profile.first_name || 'Member',
        last_name: profile.last_name || '',
        full_name: fullName || 'Member',
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        notifications_enabled: enableNotifications
      })
      .select()
      .single()

    if (memberError) {
      console.error('Membership creation error:', memberError)
      throw memberError
    }

    console.log('Successfully added authenticated member:', membership)
    return { data: membership, error: null }
  } catch (error: unknown) {
    console.error('joinContactGroup error:', error)
    const errorMessage = error instanceof Error ? error.message : handleDatabaseError(error)
    return { data: null, error: errorMessage }
  }
}

export async function joinContactGroupAnonymous(
  shareToken: string,
  firstName: string,
  lastName: string,
  email: string,
  phone?: string,
  enableNotifications = false,
  groupPassword?: string
) {
  try {
    console.log('Anonymous user joining group:', { shareToken, firstName, lastName, email })
    const normalizedEmail = email.toLowerCase().trim()

    // First, find the group by share token
    const { data: groupData, error: groupError } = await supabase
      .from('contact_groups')
      .select('id,name,is_closed,access_type,join_password_hash')
      .eq('share_token', shareToken)
      .single()

    const group = groupData as ContactGroupRow | null

    if (groupError) {
      console.error('Group lookup error:', groupError)
      throw new Error('Invalid group link or group not found.')
    }

    if (!group) {
      throw new Error('Invalid group link or group not found.')
    }

    if (group.is_closed) {
      throw new Error('This group is closed and no longer accepting new members.')
    }

    await ensureValidPasscode(group, groupPassword)

    // Check if email is already in the group
    const { data: existingMemberRaw, error: existingMemberError } = await supabase
      .from('group_memberships')
      .select('id,departed_at')
      .eq('group_id', group.id)
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingMemberError) {
      throw existingMemberError
    }

    const existingMember = existingMemberRaw as GroupMembershipLookup | null

    if (existingMember && !existingMember.departed_at) {
      throw new Error('This email address is already registered in this group.')
    }

    // Add member to group
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Member'

    const { data: membership, error: memberError } = await supabaseClient
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: null, // Anonymous user
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: fullName,
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        avatar_url: null,
        notifications_enabled: enableNotifications
      })
      .select()
      .single()

    if (memberError) {
      console.error('Membership creation error:', memberError)
      throw memberError
    }

    console.log('Successfully added anonymous member:', membership)
    return { data: membership, error: null }
  } catch (error: unknown) {
    console.error('joinContactGroupAnonymous error:', error)
    const errorMessage = error instanceof Error ? error.message : handleDatabaseError(error)
    return { data: null, error: errorMessage }
  }
}

export async function removeGroupMember(membershipId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('group_memberships')
      .update({
        departed_at: new Date().toISOString()
      })
      .eq('id', membershipId)
      .is('departed_at', null)
      .select('id,departed_at')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Member not found or already removed')
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function closeContactGroup(groupId: string) {
  try {
    const { data, error } = await rpc(supabase).closeContactGroup({
      group_uuid: groupId
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function leaveGroup(groupId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: membershipRaw, error: membershipError } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .is('departed_at', null)
      .maybeSingle()

    if (membershipError) {
      throw membershipError
    }

    const membership = membershipRaw as { id: string } | null

    if (!membership) {
      throw new Error('You are not a current member of this group.')
    }

    return removeGroupMember(membership.id)
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function getGroupMembers(groupId: string) {
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('contact_groups')
      .select(`
        id,
        owner_id,
        owner:profiles!owner_id(
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq('id', groupId)
      .single()

    if (groupError) throw groupError
    if (!groupData) throw new Error('Invalid group')

    type GroupWithOwner = {
      owner_id: string | null
      owner: {
        first_name?: string | null
        last_name?: string | null
        email?: string | null
        phone?: string | null
        avatar_url?: string | null
      } | null
    }

    const group = groupData as GroupWithOwner

    const { data, error } = await rpc(supabase).getGroupMembers({
      group_uuid: groupId
    })

    if (error) throw error

    type RpcGroupMember = Database['public']['Functions']['get_group_members']['Returns'][number]

    const rpcMembers: RpcGroupMember[] = Array.isArray(data) ? data : []

    const normalizedMembers = rpcMembers.map((member: RpcGroupMember) => {
      const firstName = typeof member.first_name === 'string' ? member.first_name.trim() : ''
      const lastName = typeof member.last_name === 'string' ? member.last_name.trim() : ''

      const hasAvatarKey = 'avatar_url' in member
      const avatarUrl = hasAvatarKey
        ? (member as RpcGroupMember & { avatar_url?: string | null }).avatar_url ?? null
        : null

      return {
        id: member.id,
        first_name: firstName,
        last_name: lastName,
        email: member.email,
        phone: member.phone,
        avatar_url: avatarUrl,
        notifications_enabled: member.notifications_enabled,
        joined_at: member.joined_at,
        is_owner: member.is_owner
      }
    })

    const ownerAlreadyIncluded = normalizedMembers.some((member) => member.is_owner)

    if (!ownerAlreadyIncluded && group.owner_id) {
      const ownerProfile = group.owner

      const ownerFirstName = (ownerProfile?.first_name ?? '').trim()
      const ownerLastName = (ownerProfile?.last_name ?? '').trim()

      normalizedMembers.unshift({
        id: group.owner_id,
        first_name: ownerFirstName || 'Group',
        last_name: ownerLastName || 'Owner',
        email: ownerProfile?.email ?? 'owner@unknown',
        phone: ownerProfile?.phone ?? undefined,
        avatar_url: ownerProfile?.avatar_url ?? null,
        notifications_enabled: false,
        joined_at: new Date().toISOString(),
        is_owner: true
      })
    }

    return { data: normalizedMembers, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function updateProfileAcrossGroups(firstName?: string, lastName?: string, phone?: string, avatarUrl?: string | null) {
  try {
    const { data, error } = await rpc(supabase).updateProfileAcrossGroups({
      new_first_name: firstName,
      new_last_name: lastName,
      new_phone: phone,
      new_avatar_url: avatarUrl
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function regenerateGroupToken(groupId: string) {
  try {
    const { data, error } = await rpc(supabase).regenerateGroupToken({
      group_uuid: groupId
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function updateGroupDetails(
  groupId: string,
  updates: {
    name?: string
    description?: string | null
    is_closed?: boolean
    access_type?: AccessType
    password?: string | null
  }
) {
  try {
    const updatePayload: Partial<ContactGroupRow> = {}

    if (typeof updates.name === 'string') {
      updatePayload.name = updates.name.trim()
    }

    if (typeof updates.description !== 'undefined') {
      updatePayload.description = updates.description ?? null
    }

    if (typeof updates.is_closed === 'boolean') {
      updatePayload.is_closed = updates.is_closed
    }

    if (updates.access_type) {
      updatePayload.access_type = updates.access_type
    }

    if (updates.password !== undefined) {
      updatePayload.join_password_hash = updates.password
        ? await hashPasscode(updates.password)
        : null
    }

    const { data, error } = await supabaseClient
      .from('contact_groups')
      .update(updatePayload as never)
      .eq('id', groupId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

// Direct table operations (with RLS protection)
export async function getUserGroups() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('Fetching groups for user:', user.id)

    // With RLS enabled, this query will automatically filter to user's accessible groups
    const { data: groups, error: groupsError } = await supabase
      .from('contact_groups')
      .select(`
        *,
        owner:profiles!owner_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      throw groupsError
    }

    console.log('User accessible groups found:', groups?.length || 0)

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(
      (groups || []).map(async (group: any) => {
        const { count } = await supabase
          .from('group_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)
        
        return {
          ...group,
          member_count: count || 0,
          is_owner: group.owner_id === user.id
        }
      })
    )
    
    console.log('Groups with counts:', groupsWithCounts)
    return { data: groupsWithCounts, error: null }
  } catch (error) {
    console.error('getUserGroups error:', error)
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function getGroupByToken(shareToken: string) {
  try {
    console.log('Fetching group by token:', shareToken)
    
    // With RLS enabled, this query will work for public access via share_token
    const { data, error } = await supabase
      .from('contact_groups')
      .select(`
        id,
        name,
        description,
        is_closed,
        access_type,
        join_password_hash,
        owner_id,
        share_token,
        owner:profiles!owner_id(first_name, last_name)
      `)
      .eq('share_token', shareToken)
      .single()

    if (error) {
      console.error('Group fetch error:', error)
      throw error
    }

    console.log('Group data fetched:', data)
    return { data, error: null }
  } catch (error: unknown) {
    console.error('getGroupByToken error:', error)
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function getUserProfile() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function updateUserProfile(updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabaseClient
      .from('profiles')
      .update(updates as any)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function getGroupStats() {
  try {
    const { data, error } = await supabase
      .from('group_stats')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

// Real-time subscriptions
export function subscribeToGroupMembers(groupId: string, callback: (payload: unknown) => void) {
  return supabase
    .channel(`group-members-${groupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'group_memberships',
        filter: `group_id=eq.${groupId}`
      },
      callback
    )
    .subscribe()
}

export function subscribeToNotificationEvents(groupId: string, callback: (payload: unknown) => void) {
  return supabase
    .channel(`notifications-${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_events',
        filter: `group_id=eq.${groupId}`
      },
      callback
    )
    .subscribe()
}
