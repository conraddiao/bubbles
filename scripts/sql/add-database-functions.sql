-- Add essential database functions for group creation
-- Run this in your Supabase SQL Editor

-- Function to create a new contact group
CREATE OR REPLACE FUNCTION create_contact_group(
  group_name TEXT,
  group_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  user_profile profiles%ROWTYPE;
BEGIN
  -- Check if user has a profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

  -- Create the group
  INSERT INTO contact_groups (name, description, owner_id)
  VALUES (group_name, group_description, auth.uid())
  RETURNING id INTO new_group_id;

  -- Add the owner as the first member
  INSERT INTO group_memberships (group_id, user_id, full_name, email, phone, notifications_enabled)
  VALUES (
    new_group_id, 
    auth.uid(), 
    COALESCE(user_profile.full_name, 'Group Owner'),
    user_profile.email,
    user_profile.phone,
    user_profile.sms_notifications_enabled
  );

  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a group anonymously (for non-authenticated users)
CREATE OR REPLACE FUNCTION join_contact_group_anonymous(
  group_token TEXT,
  member_name TEXT,
  member_email TEXT,
  member_phone TEXT DEFAULT NULL,
  enable_notifications BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
  membership_id UUID;
BEGIN
  -- Find the group by share token
  SELECT * INTO target_group FROM contact_groups WHERE share_token = group_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid group link or group not found.';
  END IF;

  -- Check if group is closed
  IF target_group.is_closed THEN
    RAISE EXCEPTION 'This group is closed and no longer accepting new members.';
  END IF;

  -- Validate input
  IF member_name IS NULL OR trim(member_name) = '' THEN
    RAISE EXCEPTION 'Name is required.';
  END IF;

  IF member_email IS NULL OR trim(member_email) = '' THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;

  -- Check if email is already in the group
  IF EXISTS (SELECT 1 FROM group_memberships WHERE group_id = target_group.id AND email = member_email) THEN
    RAISE EXCEPTION 'This email address is already registered in this group.';
  END IF;

  -- Add member to group
  INSERT INTO group_memberships (group_id, user_id, full_name, email, phone, notifications_enabled)
  VALUES (
    target_group.id,
    NULL, -- Anonymous user
    trim(member_name),
    trim(lower(member_email)),
    CASE WHEN trim(member_phone) = '' THEN NULL ELSE trim(member_phone) END,
    enable_notifications
  )
  RETURNING id INTO membership_id;

  -- Create notification event
  INSERT INTO notification_events (group_id, event_type, data)
  VALUES (
    target_group.id,
    'member_joined',
    jsonb_build_object(
      'member_name', trim(member_name),
      'member_email', trim(lower(member_email)),
      'anonymous', true
    )
  );

  RETURN membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group members with contact info (for group owners and members)
CREATE OR REPLACE FUNCTION get_group_members(group_uuid UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  notifications_enabled BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE,
  is_owner BOOLEAN
) AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
BEGIN
  -- Get the group
  SELECT * INTO target_group FROM contact_groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  -- Check if user has access to this group
  IF NOT (
    target_group.owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_memberships WHERE group_id = group_uuid AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group.';
  END IF;

  -- Return group members
  RETURN QUERY
  SELECT 
    gm.id,
    gm.full_name,
    gm.email,
    gm.phone,
    gm.notifications_enabled,
    gm.joined_at,
    (gm.user_id = target_group.owner_id) as is_owner
  FROM group_memberships gm
  WHERE gm.group_id = group_uuid
  ORDER BY gm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;