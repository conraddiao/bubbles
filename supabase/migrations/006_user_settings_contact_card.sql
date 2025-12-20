-- Enhance profile and membership contact fields for user settings and vCard support

-- Add structured name and contact image fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add structured fields to group memberships so shared contact data is available to members
ALTER TABLE group_memberships
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Backfill first and last names from the legacy full_name column when possible
UPDATE profiles
SET
  first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
  last_name = COALESCE(
    last_name,
    NULLIF(
      trim(
        regexp_replace(full_name, '^\s*' || split_part(full_name, ' ', 1) || '\s*', '', 'g')
      ),
      ''
    )
  )
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

UPDATE group_memberships
SET
  first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
  last_name = COALESCE(
    last_name,
    NULLIF(
      trim(
        regexp_replace(full_name, '^\s*' || split_part(full_name, ' ', 1) || '\s*', '', 'g')
      ),
      ''
    )
  )
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- Helper to build a full name consistently
CREATE OR REPLACE FUNCTION build_full_name(first TEXT, last TEXT, fallback TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  IF COALESCE(trim(first), '') = '' AND COALESCE(trim(last), '') = '' THEN
    RETURN COALESCE(fallback, NULL);
  END IF;

  RETURN trim(concat_ws(' ', first, last));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create a new contact group and return identifiers
CREATE OR REPLACE FUNCTION create_contact_group(
  group_name TEXT,
  group_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  new_group contact_groups%ROWTYPE;
  user_profile profiles%ROWTYPE;
  owner_full_name TEXT;
BEGIN
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

  owner_full_name := build_full_name(user_profile.first_name, user_profile.last_name, user_profile.full_name);

  INSERT INTO contact_groups (name, description, owner_id)
  VALUES (group_name, group_description, auth.uid())
  RETURNING * INTO new_group;

  INSERT INTO group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    avatar_url,
    notifications_enabled
  )
  VALUES (
    new_group.id,
    auth.uid(),
    user_profile.first_name,
    user_profile.last_name,
    COALESCE(owner_full_name, 'Group Owner'),
    user_profile.email,
    user_profile.phone,
    user_profile.avatar_url,
    COALESCE(user_profile.sms_notifications_enabled, FALSE)
  );

  RETURN jsonb_build_object(
    'group_id', new_group.id,
    'share_token', new_group.share_token
  );
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
  member_full_name TEXT;
BEGIN
  SELECT * INTO target_group FROM contact_groups WHERE share_token = group_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid group link or group not found.';
  END IF;

  IF target_group.is_closed THEN
    RAISE EXCEPTION 'This group is closed and no longer accepting new members.';
  END IF;

  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

  IF EXISTS (SELECT 1 FROM group_memberships WHERE group_id = target_group.id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already a member of this group.';
  END IF;

  member_full_name := build_full_name(user_profile.first_name, user_profile.last_name, user_profile.full_name);

  INSERT INTO group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    avatar_url,
    notifications_enabled
  )
  VALUES (
    target_group.id,
    auth.uid(),
    user_profile.first_name,
    user_profile.last_name,
    COALESCE(member_full_name, 'Member'),
    user_profile.email,
    user_profile.phone,
    user_profile.avatar_url,
    enable_notifications
  )
  RETURNING id INTO membership_id;

  INSERT INTO notification_events (group_id, event_type, data)
  VALUES (
    target_group.id,
    'member_joined',
    jsonb_build_object(
      'member_name', COALESCE(member_full_name, 'Member'),
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
  member_first_name TEXT,
  member_last_name TEXT,
  member_email TEXT,
  member_phone TEXT DEFAULT NULL,
  enable_notifications BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
  membership_id UUID;
  member_full_name TEXT;
BEGIN
  SELECT * INTO target_group FROM contact_groups WHERE share_token = group_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid group link or group not found.';
  END IF;

  IF target_group.is_closed THEN
    RAISE EXCEPTION 'This group is closed and no longer accepting new members.';
  END IF;

  IF member_email IS NULL OR trim(member_email) = '' THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM group_memberships WHERE group_id = target_group.id AND email = trim(lower(member_email))
  ) THEN
    RAISE EXCEPTION 'This email address is already registered in this group.';
  END IF;

  member_full_name := build_full_name(member_first_name, member_last_name, NULL);

  INSERT INTO group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
    full_name,
    email,
    phone,
    avatar_url,
    notifications_enabled
  )
  VALUES (
    target_group.id,
    NULL,
    NULLIF(trim(member_first_name), ''),
    NULLIF(trim(member_last_name), ''),
    COALESCE(member_full_name, 'Member'),
    trim(lower(member_email)),
    CASE WHEN trim(COALESCE(member_phone, '')) = '' THEN NULL ELSE trim(member_phone) END,
    NULL,
    enable_notifications
  )
  RETURNING id INTO membership_id;

  INSERT INTO notification_events (group_id, event_type, data)
  VALUES (
    target_group.id,
    'member_joined',
    jsonb_build_object(
      'member_name', COALESCE(member_full_name, 'Member'),
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
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  notifications_enabled BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE,
  is_owner BOOLEAN
) AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
BEGIN
  SELECT * INTO target_group FROM contact_groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF NOT (
    target_group.owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM group_memberships WHERE group_id = group_uuid AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group.';
  END IF;

  RETURN QUERY
  SELECT 
    gm.id,
    COALESCE(NULLIF(gm.first_name, ''), NULLIF(split_part(gm.full_name, ' ', 1), '')),
    COALESCE(
      NULLIF(gm.last_name, ''),
      NULLIF(
        trim(
          regexp_replace(gm.full_name, '^\s*' || split_part(gm.full_name, ' ', 1) || '\s*', '', 'g')
        ),
        ''
      ),
      ''
    ),
    gm.email,
    gm.phone,
    gm.avatar_url,
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
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  new_full_name TEXT;
BEGIN
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  new_full_name := build_full_name(
    COALESCE(new_first_name, user_profile.first_name),
    COALESCE(new_last_name, user_profile.last_name),
    user_profile.full_name
  );

  UPDATE profiles 
  SET 
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = auth.uid();

  UPDATE group_memberships
  SET 
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    avatar_url = COALESCE(new_avatar_url, avatar_url)
  WHERE user_id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
