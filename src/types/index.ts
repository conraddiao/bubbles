// Database types based on the design document
export interface Profile {
  id: string
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string | null
  phone_verified: boolean
  two_factor_enabled: boolean
  sms_notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ContactGroup {
  id: string
  name: string
  description?: string
  owner_id: string
  is_closed: boolean
  share_token: string
  requires_password?: boolean
  is_password_protected?: boolean
  password_required?: boolean
  created_at: string
  updated_at: string
  owner?: Profile
  member_count?: number
}

export interface GroupMembership {
  id: string
  group_id: string
  user_id?: string
  full_name?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string | null
  notifications_enabled: boolean
  joined_at: string
  group?: ContactGroup
}

export interface NotificationEvent {
  id: string
  group_id: string
  event_type: 'member_joined' | 'member_left' | 'group_closed'
  data: Record<string, unknown>
  created_at: string
}

export interface SMSNotification {
  id: string
  recipient_phone: string
  message_type: 'group_closed' | 'member_notification' | '2fa_code'
  twilio_sid?: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  group_id?: string
  sent_at: string
}

// Form types
export interface ContactFormData {
  first_name: string
  last_name: string
  email: string
  phone?: string
  notifications_enabled: boolean
}

export interface GroupCreationFormData {
  name: string
  description?: string
}

export interface AuthFormData {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
}

// API response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// Supabase database types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'created_at' | 'updated_at'>>
      }
      contact_groups: {
        Row: ContactGroup
        Insert: Omit<ContactGroup, 'id' | 'created_at' | 'updated_at' | 'share_token'>
        Update: Partial<Omit<ContactGroup, 'id' | 'created_at' | 'updated_at' | 'share_token'>>
      }
      group_memberships: {
        Row: GroupMembership
        Insert: Omit<GroupMembership, 'id' | 'joined_at'>
        Update: Partial<Omit<GroupMembership, 'id' | 'joined_at'>>
      }
      notification_events: {
        Row: NotificationEvent
        Insert: Omit<NotificationEvent, 'id' | 'created_at'>
        Update: Partial<Omit<NotificationEvent, 'id' | 'created_at'>>
      }
      sms_notifications: {
        Row: SMSNotification
        Insert: Omit<SMSNotification, 'id' | 'sent_at'>
        Update: Partial<Omit<SMSNotification, 'id' | 'sent_at'>>
      }
    }
    Functions: {
      create_contact_group: {
        Args: { group_name: string; group_description?: string }
        Returns: { group_id: string; share_token: string }
      }
      join_contact_group: {
        Args: { group_token: string; enable_notifications?: boolean }
        Returns: string
      }
      join_contact_group_anonymous: {
        Args: {
          group_token: string
          member_first_name: string
          member_last_name: string
          member_email: string
          member_phone?: string
          enable_notifications?: boolean
        }
        Returns: string
      }
      remove_group_member: {
        Args: { membership_uuid: string }
        Returns: boolean
      }
      close_contact_group: {
        Args: { group_uuid: string }
        Returns: boolean
      }
      get_group_members: {
        Args: { group_uuid: string }
        Returns: Array<{
          id: string
          first_name: string
          last_name: string
          email: string
          phone?: string
          notifications_enabled: boolean
          joined_at: string
          is_owner: boolean
        }>
      }
      update_profile_across_groups: {
        Args: { new_first_name?: string; new_last_name?: string; new_phone?: string; new_avatar_url?: string | null }
        Returns: boolean
      }
      regenerate_group_token: {
        Args: { group_uuid: string }
        Returns: string
      }
    }
  }
}
