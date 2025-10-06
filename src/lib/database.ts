import { supabase, handleDatabaseError } from './supabase'
import type { Profile } from '@/types'

// Type assertion for RPC calls until database functions are deployed
const rpc = (client: typeof supabase) => ({
  createContactGroup: (args: { group_name: string; group_description?: string }) =>
    client.rpc('create_contact_group' as any, args as any),
  joinContactGroup: (args: { group_token: string; enable_notifications?: boolean }) =>
    client.rpc('join_contact_group' as any, args as any),
  joinContactGroupAnonymous: (args: {
    group_token: string
    member_name: string
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
  updateProfileAcrossGroups: (args: { new_full_name?: string; new_phone?: string }) =>
    client.rpc('update_profile_across_groups' as any, args as any),
  regenerateGroupToken: (args: { group_uuid: string }) =>
    client.rpc('regenerate_group_token' as any, args as unknown),
})

// Group management functions
export async function createContactGroup(name: string, description?: string) {
  try {
    const { data, error } = await rpc(supabase).createContactGroup({
      group_name: name,
      group_description: description
    })

    if (error) throw error
    
    // The function now returns JSON with both group_id and share_token
    return { 
      data: {
        group_id: data.group_id,
        share_token: data.share_token
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('User profile not found. Please complete your profile first.')

    // Find the group by share token
    const { data: group, error: groupError } = await supabase
      .from('contact_groups')
      .select('id, name, is_closed')
      .eq('share_token', shareToken)
      .single()

    if (groupError) {
      console.error('Group lookup error:', groupError)
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
    const { data: membership, error: memberError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: user.id,
        full_name: profile.full_name || 'Member',
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
  fullName: string,
  email: string,
  phone?: string,
  enableNotifications = false
) {
  try {
    console.log('Anonymous user joining group:', { shareToken, fullName, email })

    // First, find the group by share token
    const { data: group, error: groupError } = await supabase
      .from('contact_groups')
      .select('id, name, is_closed')
      .eq('share_token', shareToken)
      .single()

    if (groupError) {
      console.error('Group lookup error:', groupError)
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
    const { data: membership, error: memberError } = await supabase
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: null, // Anonymous user
        full_name: fullName.trim(),
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
    const { data, error } = await rpc(supabase).getGroupMembers({
      group_uuid: groupId
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: handleDatabaseError(error) }
  }
}

export async function updateProfileAcrossGroups(fullName?: string, phone?: string) {
  try {
    const { data, error } = await rpc(supabase).updateProfileAcrossGroups({
      new_full_name: fullName,
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

    // First, let's see if any groups exist at all
    const { data: testGroups, error: testError } = await supabase
      .from('contact_groups')
      .select('id, name, owner_id')
      .limit(5)

    console.log('Test query - groups exist:', testGroups)
    if (testError) console.error('Test query error:', testError)

    // Since RLS is disabled, let's get all groups and filter manually
    const { data: allGroups, error: groupsError } = await supabase
      .from('contact_groups')
      .select('*')
      .order('created_at', { ascending: false })

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      throw groupsError
    }

    console.log('All groups found:', allGroups?.length || 0)
    console.log('Groups owned by user:', allGroups?.filter((g: any) => g.owner_id === user.id).length || 0)

    // Get user's memberships
    const { data: memberships, error: memberError } = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching memberships:', memberError)
      throw memberError
    }

    console.log('User memberships:', memberships?.length || 0)

    // Filter groups where user is owner or member
    const memberGroupIds = new Set(memberships?.map((m: any) => m.group_id) || [])
    const userGroups = allGroups?.filter((group: any) => 
      group.owner_id === user.id || memberGroupIds.has(group.id)
    ) || []

    console.log('Filtered user groups:', userGroups.length)

    // Get member counts for user's groups
    const groupsWithCounts = await Promise.all(
      userGroups.map(async (group: unknown) => {
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
    
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log('Group fetch timeout, aborting...')
      controller.abort()
    }, 5000)
    
    // Test basic connection first
    console.log('Testing basic database connection...')
    const { data: testData, error: testError } = await supabase
      .from('contact_groups')
      .select('count')
      .limit(1)
    
    console.log('Basic connection test result:', { testData, testError })
    
    if (testError) {
      console.error('Basic connection failed:', testError)
      throw new Error('Database connection failed: ' + testError.message)
    }
    
    // Since RLS is disabled, use regular client
    console.log('Attempting actual group query...')
    const { data, error } = await supabase
      .from('contact_groups')
      .select('id, name, description, is_closed, owner_id, share_token')
      .eq('share_token', shareToken)
      .abortSignal(controller.signal)
      .single()

    clearTimeout(timeoutId)

    if (error) {
      console.error('Group fetch error:', error)
      throw error
    }

    console.log('Group data fetched:', data)

    // Get owner info separately with timeout
    let ownerInfo = null
    if (data.owner_id) {
      try {
        const ownerController = new AbortController()
        const ownerTimeoutId = setTimeout(() => ownerController.abort(), 3000)
        
        const { data: owner } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.owner_id)
          .abortSignal(ownerController.signal)
          .single()
        
        clearTimeout(ownerTimeoutId)
        ownerInfo = owner
        console.log('Owner info fetched:', ownerInfo)
      } catch (ownerError) {
        console.warn('Could not fetch owner info:', ownerError)
        // Continue without owner info
      }
    }

    const result = {
      ...data,
      owner: ownerInfo
    }

    console.log('Final group result:', result)
    return { data: result, error: null }
  } catch (error: unknown) {
    console.error('getGroupByToken error:', error)
    if (error instanceof Error && error.name === 'AbortError') {
      return { data: null, error: 'Request timed out. Please try again.' }
    }
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

    const { data, error } = await supabase
      .from('profiles')
      .update(updates as unknown)
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