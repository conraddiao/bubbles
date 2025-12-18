import { supabase, handleDatabaseError } from './supabase'
import type { Database, Profile } from '@/types'

type ContactGroupRow = Database['public']['Tables']['contact_groups']['Row']
const supabaseClient = supabase as any

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
  updateProfileAcrossGroups: (args: { new_first_name?: string; new_last_name?: string; new_phone?: string }) =>
    client.rpc('update_profile_across_groups' as any, args as any),
  regenerateGroupToken: (args: { group_uuid: string }) =>
    client.rpc('regenerate_group_token' as any, args as any),
})

// Group management functions
export async function createContactGroup(name: string, description?: string) {
  try {
    const { data, error } = await rpc(supabase).createContactGroup({
      group_name: name,
      group_description: description
    })

    if (error) throw error
    const result = data as { group_id: string; share_token: string }
    
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

export async function joinContactGroup(shareToken: string, enableNotifications = false) {
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

    // Find the group by share token
    const { data: groupData, error: groupError } = await supabase
      .from('contact_groups')
      .select('id, name, is_closed')
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

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      throw new Error('You are already a member of this group.')
    }

    // Add user to group
    const { data: membership, error: memberError } = await supabaseClient
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: user.id,
        first_name: profile.first_name || 'Member',
        last_name: profile.last_name || '',
        email: profile.email,
        phone: profile.phone,
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
  enableNotifications = false
) {
  try {
    console.log('Anonymous user joining group:', { shareToken, firstName, lastName, email })

    // First, find the group by share token
    const { data: groupData, error: groupError } = await supabase
      .from('contact_groups')
      .select('id, name, is_closed')
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

    // Check if email is already in the group
    const { data: existingMember } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingMember) {
      throw new Error('This email address is already registered in this group.')
    }

    // Add member to group
    const { data: membership, error: memberError } = await supabaseClient
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: null, // Anonymous user
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
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
    const { data, error } = await rpc(supabase).removeGroupMember({
      membership_uuid: membershipId
    })

    if (error) throw error
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

export async function getGroupMembers(groupId: string) {
  try {
    // First, try to get the current user to determine ownership
    const { data: { user } } = await supabase.auth.getUser()
    
    // Query group memberships using first_name and last_name only
    const { data: memberships, error: memberError } = await supabase
      .from('group_memberships')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        notifications_enabled,
        joined_at,
        user_id
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true })

    if (memberError) throw memberError

    // Get group info to determine owner
    const { data: groupData, error: groupError } = await supabase
      .from('contact_groups')
      .select('owner_id')
      .eq('id', groupId)
      .single()

    const group = groupData as ContactGroupRow | null

    if (groupError) throw groupError
    if (!group) throw new Error('Invalid group')

    // Transform the data using first_name and last_name
    const transformedData = memberships?.map((member: any) => ({
      id: member.id,
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email,
      phone: member.phone,
      notifications_enabled: member.notifications_enabled,
      joined_at: member.joined_at,
      is_owner: member.user_id === group.owner_id
    })) || []

    return { data: transformedData, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function updateProfileAcrossGroups(firstName?: string, lastName?: string, phone?: string) {
  try {
    const { data, error } = await rpc(supabase).updateProfileAcrossGroups({
      new_first_name: firstName,
      new_last_name: lastName,
      new_phone: phone
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
