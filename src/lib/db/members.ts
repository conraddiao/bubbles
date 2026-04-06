import { supabase, handleDatabaseError, rpc } from './rpc'
import type { ContactGroupRow } from './rpc'
import type { Profile } from '@/types'

export async function removeGroupMember(membershipId: string) {
  try {
    const { data, error } = await rpc(supabase).removeGroupMember({
      membership_uuid: membershipId
    })

    if (error) throw error
    if (!data) throw new Error('Member not found or already removed')
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
    const { data: { user } } = await supabase.auth.getUser()

    const { data: memberships, error: memberError } = await supabase
      .from('group_memberships')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        notifications_enabled,
        joined_at,
        user_id,
        departed_at
      `)
      .eq('group_id', groupId)
      .is('departed_at', null)
      .order('joined_at', { ascending: true })

    if (memberError) throw memberError

    const { data: groupData, error: groupError } = await supabase
      .from('contact_groups')
      .select('owner_id')
      .eq('id', groupId)
      .single()

    const group = groupData as ContactGroupRow | null

    if (groupError) throw groupError
    if (!group) throw new Error('Invalid group')

    const transformedData =
      memberships?.map((member: any) => {
        const firstName = typeof member.first_name === 'string' ? member.first_name.trim() : ''
        const lastName = typeof member.last_name === 'string' ? member.last_name.trim() : ''

        return {
          id: member.id,
          first_name: firstName,
          last_name: lastName,
          email: member.email,
          phone: member.phone,
          avatar_url: member.avatar_url,
          notifications_enabled: member.notifications_enabled,
          joined_at: member.joined_at,
          is_owner: member.user_id === group.owner_id
        }
      }) || []

    return { data: transformedData, error: null }
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
