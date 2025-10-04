-- Database functions for group management operations
-- These functions handle complex operations with proper error handling and notifications

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

-- Function to join a group (for authenticated users)
CREATE OR REPLACE FUNCTION join_contact_group(
  group_token TEXT,
  enable_notifications BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
  user_profile profiles%ROWTYPE;
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

  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM group_memberships WHERE group_id = target_group.id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already a member of this group.';
  END IF;

  -- Add user to group
  INSERT INTO group_memberships (group_id, user_id, full_name, email, phone, notifications_enabled)
  VALUES (
    target_group.id,
    auth.uid(),
    COALESCE(user_profile.full_name, 'Member'),
    user_profile.email,
    user_profile.phone,
    enable_notifications
  )
  RETURNING id INTO membership_id;

  -- Create notification event
  INSERT INTO notification_events (group_id, event_type, data)
  VALUES (
    target_group.id,
    'member_joined',
    jsonb_build_object(
      'member_name', COALESCE(user_profile.full_name, 'Member'),
      'member_email', user_profile.email,
      'user_id', auth.uid()
    )
  );

  RETURN membership_id;
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

-- Function to remove a member from a group
CREATE OR REPLACE FUNCTION remove_group_member(
  membership_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  membership group_memberships%ROWTYPE;
  target_group contact_groups%ROWTYPE;
BEGIN
  -- Get the membership record
  SELECT * INTO membership FROM group_memberships WHERE id = membership_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found.';
  END IF;

  -- Get the group
  SELECT * INTO target_group FROM contact_groups WHERE id = membership.group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  -- Check permissions: user can remove themselves or group owner can remove anyone
  IF NOT (membership.user_id = auth.uid() OR target_group.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to remove this member.';
  END IF;

  -- Prevent group owner from removing themselves
  IF target_group.owner_id = auth.uid() AND membership.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Group owners cannot remove themselves. Transfer ownership or delete the group instead.';
  END IF;

  -- Create notification event before deletion
  INSERT INTO notification_events (group_id, event_type, data)
  VALUES (
    membership.group_id,
    'member_left',
    jsonb_build_object(
      'member_name', membership.full_name,
      'member_email', membership.email,
      'removed_by_owner', target_group.owner_id = auth.uid()
    )
  );

  -- Remove the membership
  DELETE FROM group_memberships WHERE id = membership_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to close a group
CREATE OR REPLACE FUNCTION close_contact_group(
  group_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
BEGIN
  -- Get the group
  SELECT * INTO target_group FROM contact_groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  -- Check if user is the owner
  IF target_group.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the group owner can close the group.';
  END IF;

  -- Check if group is already closed
  IF target_group.is_closed THEN
    RAISE EXCEPTION 'Group is already closed.';
  END IF;

  -- Close the group
  UPDATE contact_groups SET is_closed = TRUE WHERE id = group_uuid;

  -- Create notification event
  INSERT INTO notification_events (group_id, event_type, data)
  VALUES (
    group_uuid,
    'group_closed',
    jsonb_build_object(
      'closed_by', auth.uid(),
      'group_name', target_group.name,
      'closed_at', NOW()
    )
  );

  RETURN TRUE;
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

-- Function to update user profile across all groups
CREATE OR REPLACE FUNCTION update_profile_across_groups(
  new_full_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile profiles%ROWTYPE;
BEGIN
  -- Get current profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- Update profile
  UPDATE profiles 
  SET 
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    updated_at = NOW()
  WHERE id = auth.uid();

  -- Update group memberships
  UPDATE group_memberships
  SET 
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone)
  WHERE user_id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;