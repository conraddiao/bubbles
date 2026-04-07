import { supabase, handleDatabaseError, rpc, supabaseClient, hashPasscode } from './rpc'
import type { ContactGroupRow, AccessType } from './rpc'
import type { Database, Profile } from '@/types'

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

async function batchMemberCounts(groupIds: string[]): Promise<Map<string, number>> {
  if (groupIds.length === 0) return new Map()
  const { data } = await supabase
    .from('group_memberships')
    .select('group_id')
    .in('group_id', groupIds)
    .is('departed_at', null)
    .returns<{ group_id: string }[]>()
  const counts = new Map<string, number>()
  for (const m of data ?? []) {
    counts.set(m.group_id, (counts.get(m.group_id) || 0) + 1)
  }
  return counts
}

async function getGroupForJoin(shareToken: string) {
  const { data: groupData, error: groupError } = await supabase
    .from('contact_groups')
    .select('id,name,is_closed,archived_at,access_type,join_password_hash')
    .eq('share_token', shareToken)
    .single()

  if (groupError) {
    throw groupError
  }

  if (!groupData) {
    throw new Error('Invalid group link or group not found.')
  }

  return groupData as ContactGroupRow
}

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    const profile = profileData as Profile | null

    if (!profile) throw new Error('User profile not found. Please complete your profile first.')

    const group = await getGroupForJoin(shareToken)

    if (group.is_closed) {
      throw new Error('This group is closed and no longer accepting new members.')
    }

    if (group.archived_at) {
      throw new Error('This group is no longer available.')
    }

    await ensureValidPasscode(group, groupPassword)

    const { data, error } = await rpc(supabase).joinContactGroup({
      group_token: shareToken,
      enable_notifications: enableNotifications
    })

    if (error) {
      console.error('Membership creation error:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to join group. Please try again.')
    }

    return { data, error: null }
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
    const normalizedEmail = email.toLowerCase().trim()
    const group = await getGroupForJoin(shareToken)

    if (group.is_closed) {
      throw new Error('This group is closed and no longer accepting new members.')
    }

    if (group.archived_at) {
      throw new Error('This group is no longer available.')
    }

    await ensureValidPasscode(group, groupPassword)

    type GroupMembershipLookup = Pick<Database['public']['Tables']['group_memberships']['Row'], 'id' | 'departed_at'>

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

    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()
    const sanitizedPhone = phone?.trim() || undefined

    const { data, error } = await rpc(supabase).joinContactGroupAnonymous({
      group_token: shareToken,
      member_first_name: normalizedFirstName || 'Member',
      member_last_name: normalizedLastName,
      member_email: normalizedEmail,
      member_phone: sanitizedPhone,
      enable_notifications: enableNotifications
    })

    if (error) {
      console.error('Membership creation error:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to join group. Please try again.')
    }

    return { data, error: null }
  } catch (error: unknown) {
    console.error('joinContactGroupAnonymous error:', error)
    const errorMessage = error instanceof Error ? error.message : handleDatabaseError(error)
    return { data: null, error: errorMessage }
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

export async function archiveContactGroup(groupId: string) {
  try {
    const { data, error } = await rpc(supabase).archiveContactGroup({
      group_uuid: groupId
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function unarchiveContactGroup(groupId: string) {
  try {
    const { data, error } = await rpc(supabase).unarchiveContactGroup({
      group_uuid: groupId
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
    const updatePayload: Database['public']['Tables']['contact_groups']['Update'] = {}

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

export async function getUserGroups(userId?: string, userEmail?: string) {
  try {
    let resolvedId = userId
    let resolvedEmail = userEmail

    if (!resolvedId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      resolvedId = user.id
      resolvedEmail = user.email ?? undefined
    }

    const membershipFilters = [`user_id.eq.${resolvedId}`]

    if (typeof resolvedEmail === 'string' && resolvedEmail.length > 0) {
      membershipFilters.push(`email.eq.${resolvedEmail}`)
    }

    type MembershipGroupRef = Pick<Database['public']['Tables']['group_memberships']['Row'], 'group_id'>
    const { data: memberships, error: membershipsError } = await supabase
      .from('group_memberships')
      .select('group_id')
      .or(membershipFilters.join(','))
      .is('departed_at', null)

    if (membershipsError) {
      throw membershipsError
    }

    const accessibleGroupIds = new Set<string>()
    const membershipRecords: MembershipGroupRef[] = memberships ?? []

    for (const membership of membershipRecords) {
      if (typeof membership.group_id === 'string') {
        accessibleGroupIds.add(membership.group_id)
      }
    }

    const baseSelect = '*, owner:profiles!owner_id(first_name, last_name)'
    type GroupWithOwner = ContactGroupRow & { owner?: Profile }
    const groupsById = new Map<string, GroupWithOwner>()

    if (accessibleGroupIds.size > 0) {
      const { data: memberGroups, error: memberGroupsError } = await supabase
        .from('contact_groups')
        .select(baseSelect)
        .in('id', Array.from(accessibleGroupIds))
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .returns<GroupWithOwner[]>()

      if (memberGroupsError) {
        throw memberGroupsError
      }

      for (const group of memberGroups ?? []) {
        if (typeof group.id === 'string') {
          groupsById.set(group.id, group)
        }
      }
    }

    const { data: ownedGroups, error: ownedGroupsError } = await supabase
      .from('contact_groups')
      .select(baseSelect)
      .eq('owner_id', resolvedId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .returns<GroupWithOwner[]>()

    if (ownedGroupsError) {
      throw ownedGroupsError
    }

    for (const group of ownedGroups ?? []) {
      if (typeof group.id === 'string') {
        groupsById.set(group.id, group)
      }
    }

    const mergedGroups = Array.from(groupsById.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const countMap = await batchMemberCounts(mergedGroups.map(g => g.id))
    const groupsWithCounts = mergedGroups.map(group => ({
      ...group,
      member_count: countMap.get(group.id) || 0,
      is_owner: group.owner_id === resolvedId,
    }))

    return { data: groupsWithCounts, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function getArchivedGroups(userId?: string) {
  try {
    let resolvedId = userId

    if (!resolvedId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      resolvedId = user.id
    }

    const baseSelect = '*, owner:profiles!owner_id(first_name, last_name)'
    type GroupWithOwner = ContactGroupRow & { owner?: Profile }

    const { data: archivedGroups, error } = await supabase
      .from('contact_groups')
      .select(baseSelect)
      .eq('owner_id', resolvedId)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
      .returns<GroupWithOwner[]>()

    if (error) throw error

    const archivedList = archivedGroups ?? []
    const countMap = await batchMemberCounts(archivedList.map(g => g.id))
    const groupsWithCounts = archivedList.map(group => ({
      ...group,
      member_count: countMap.get(group.id) || 0,
      is_owner: group.owner_id === resolvedId,
    }))

    return { data: groupsWithCounts, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function getGroupByToken(shareToken: string) {
  try {
    const { data, error } = await rpc(supabaseClient).getGroupByShareToken({ group_token: shareToken })
    if (error) throw error

    const rows = data as Array<ContactGroupRow & { owner_first_name?: string | null; owner_last_name?: string | null }> | null
    const row = (Array.isArray(rows) && rows.length > 0) ? rows[0] : null

    if (!row) {
      throw new Error('Invalid group link or group not found.')
    }

    const owner =
      row.owner_first_name || row.owner_last_name
        ? {
            first_name: row.owner_first_name ?? undefined,
            last_name: row.owner_last_name ?? undefined
          }
        : undefined

    const { owner_first_name, owner_last_name, ...rest } = row
    const normalizedGroup = {
      ...rest,
      owner
    }

    return { data: normalizedGroup, error: null }
  } catch (error: unknown) {
    console.error('getGroupByToken error:', error)
    return { data: null, error: handleDatabaseError(error) }
  }
}
