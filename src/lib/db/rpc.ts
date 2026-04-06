import { supabase, handleDatabaseError } from '../supabase'
import type { Database } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ContactGroupRow = Database['public']['Tables']['contact_groups']['Row']
export type GroupMembershipLookup = Pick<Database['public']['Tables']['group_memberships']['Row'], 'id' | 'departed_at'>
export type AccessType = ContactGroupRow['access_type']

export const supabaseClient: SupabaseClient<Database> = supabase

// Type assertion for RPC calls until database functions are deployed
export const rpc = (client: typeof supabase) => ({
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
  archiveContactGroup: (args: { group_uuid: string }) =>
    client.rpc('archive_contact_group' as any, args as any),
  unarchiveContactGroup: (args: { group_uuid: string }) =>
    client.rpc('unarchive_contact_group' as any, args as any),
  getGroupMembers: (args: { group_uuid: string }) =>
    client.rpc('get_group_members' as any, args as any),
  getGroupByShareToken: (args: { group_token: string }) =>
    client.rpc('get_group_by_share_token' as any, args as any),
  updateProfileAcrossGroups: (args: {
    new_first_name?: string
    new_last_name?: string
    new_phone?: string
    new_avatar_url?: string | null
  }) =>
    client.rpc('update_profile_across_groups' as any, args as any),
  regenerateGroupToken: (args: { group_uuid: string }) =>
    client.rpc('regenerate_group_token' as any, args as any),
  logShareLinkView: (args: {
    group_token: string
    p_referrer?: string | null
    p_utm_source?: string | null
    p_utm_medium?: string | null
    p_utm_campaign?: string | null
  }) =>
    client.rpc('log_share_link_view' as any, args as any),
  getShareLinkAnalytics: (args: { group_uuid: string }) =>
    client.rpc('get_share_link_analytics' as any, args as any),
})

export async function hashPasscode(passcode: string) {
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

export { supabase, handleDatabaseError }
