-- Migrate legacy full_name usage to first_name/last_name everywhere

-- Ensure name columns exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.group_memberships
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Backfill split names from full_name when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'full_name'
  ) THEN
    UPDATE public.profiles
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
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'group_memberships'
      AND column_name = 'full_name'
  ) THEN
    UPDATE public.group_memberships
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
  END IF;
END $$;

-- Drop legacy full_name columns after backfill
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS full_name;

ALTER TABLE public.group_memberships
  DROP COLUMN IF EXISTS full_name;

-- Helper to build a display name without persisting full_name
CREATE OR REPLACE FUNCTION public.build_full_name(first TEXT, last TEXT, fallback TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  IF COALESCE(trim(first), '') = '' AND COALESCE(trim(last), '') = '' THEN
    RETURN COALESCE(fallback, NULL);
  END IF;

  RETURN trim(concat_ws(' ', first, last));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auth trigger to create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    phone_verified,
    two_factor_enabled,
    sms_notifications_enabled
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    FALSE,
    FALSE,
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.contact_groups
  SET owner_id = (
    SELECT user_id
    FROM public.group_memberships
    WHERE group_id = public.contact_groups.id
      AND user_id != OLD.id
      AND user_id IS NOT NULL
    LIMIT 1
  )
  WHERE owner_id = OLD.id;

  DELETE FROM public.contact_groups
  WHERE owner_id IS NULL;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new contact group and return identifiers
CREATE OR REPLACE FUNCTION public.create_contact_group(
  group_name TEXT,
  group_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  new_group public.contact_groups%ROWTYPE;
  user_profile public.profiles%ROWTYPE;
  owner_full_name TEXT;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

  owner_full_name := build_full_name(user_profile.first_name, user_profile.last_name, user_profile.email);

  INSERT INTO public.contact_groups (name, description, owner_id)
  VALUES (group_name, group_description, auth.uid())
  RETURNING * INTO new_group;

  INSERT INTO public.group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
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
CREATE OR REPLACE FUNCTION public.join_contact_group(
  group_token TEXT,
  enable_notifications BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  target_group public.contact_groups%ROWTYPE;
  user_profile public.profiles%ROWTYPE;
  membership_id UUID;
  member_full_name TEXT;
BEGIN
  SELECT * INTO target_group FROM public.contact_groups WHERE share_token = group_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid group link or group not found.';
  END IF;

  IF target_group.is_closed THEN
    RAISE EXCEPTION 'This group is closed and no longer accepting new members.';
  END IF;

  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_memberships WHERE group_id = target_group.id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are already a member of this group.';
  END IF;

  member_full_name := build_full_name(user_profile.first_name, user_profile.last_name, user_profile.email);

  INSERT INTO public.group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
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
    user_profile.email,
    user_profile.phone,
    user_profile.avatar_url,
    enable_notifications
  )
  RETURNING id INTO membership_id;

  INSERT INTO public.notification_events (group_id, event_type, data)
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
CREATE OR REPLACE FUNCTION public.join_contact_group_anonymous(
  group_token TEXT,
  member_first_name TEXT,
  member_last_name TEXT,
  member_email TEXT,
  member_phone TEXT DEFAULT NULL,
  enable_notifications BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  target_group public.contact_groups%ROWTYPE;
  membership_id UUID;
  member_full_name TEXT;
BEGIN
  SELECT * INTO target_group FROM public.contact_groups WHERE share_token = group_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid group link or group not found.';
  END IF;

  IF target_group.is_closed THEN
    RAISE EXCEPTION 'This group is closed and no longer accepting new members.';
  END IF;

  IF (member_first_name IS NULL OR trim(member_first_name) = '')
    AND (member_last_name IS NULL OR trim(member_last_name) = '') THEN
    RAISE EXCEPTION 'Name is required.';
  END IF;

  IF member_email IS NULL OR trim(member_email) = '' THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = target_group.id AND email = trim(lower(member_email))
  ) THEN
    RAISE EXCEPTION 'This email address is already registered in this group.';
  END IF;

  member_full_name := build_full_name(trim(member_first_name), trim(member_last_name), trim(lower(member_email)));

  INSERT INTO public.group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    avatar_url,
    notifications_enabled
  )
  VALUES (
    target_group.id,
    NULL,
    trim(member_first_name),
    trim(member_last_name),
    trim(lower(member_email)),
    CASE WHEN trim(member_phone) = '' THEN NULL ELSE trim(member_phone) END,
    NULL,
    enable_notifications
  )
  RETURNING id INTO membership_id;

  INSERT INTO public.notification_events (group_id, event_type, data)
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

-- Function to remove a member from a group
CREATE OR REPLACE FUNCTION public.remove_group_member(
  membership_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  membership public.group_memberships%ROWTYPE;
  target_group public.contact_groups%ROWTYPE;
  member_full_name TEXT;
BEGIN
  SELECT * INTO membership FROM public.group_memberships WHERE id = membership_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found.';
  END IF;

  SELECT * INTO target_group FROM public.contact_groups WHERE id = membership.group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF NOT (membership.user_id = auth.uid() OR target_group.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to remove this member.';
  END IF;

  IF target_group.owner_id = auth.uid() AND membership.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Group owners cannot remove themselves. Transfer ownership or delete the group instead.';
  END IF;

  member_full_name := build_full_name(membership.first_name, membership.last_name, membership.email);

  INSERT INTO public.notification_events (group_id, event_type, data)
  VALUES (
    membership.group_id,
    'member_left',
    jsonb_build_object(
      'member_name', COALESCE(member_full_name, 'Member'),
      'member_email', membership.email,
      'removed_by_owner', target_group.owner_id = auth.uid()
    )
  );

  DELETE FROM public.group_memberships WHERE id = membership_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group members with contact info (for group owners and members)
DROP FUNCTION IF EXISTS public.get_group_members(UUID);

CREATE OR REPLACE FUNCTION public.get_group_members(group_uuid UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  notifications_enabled BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE,
  is_owner BOOLEAN
) AS $$
DECLARE
  target_group public.contact_groups%ROWTYPE;
BEGIN
  SELECT * INTO target_group FROM public.contact_groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF NOT (
    target_group.owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = group_uuid AND user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group.';
  END IF;

  RETURN QUERY
  SELECT
    gm.id,
    gm.first_name,
    gm.last_name,
    gm.email,
    gm.phone,
    gm.notifications_enabled,
    gm.joined_at,
    (gm.user_id = target_group.owner_id) as is_owner
  FROM public.group_memberships gm
  WHERE gm.group_id = group_uuid
    AND gm.departed_at IS NULL
  ORDER BY gm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile across all groups
CREATE OR REPLACE FUNCTION public.update_profile_across_groups(
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  UPDATE public.profiles
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    phone = COALESCE(new_phone, phone),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = auth.uid();

  UPDATE public.group_memberships
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    phone = COALESCE(new_phone, phone),
    avatar_url = COALESCE(new_avatar_url, avatar_url)
  WHERE user_id = auth.uid();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
