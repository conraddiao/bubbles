-- Fix lint issues in database functions
-- Applies fixes from 008/015 that were corrected after those migrations already ran on remote

-- Fix 1: Remove unused owner_full_name variable from create_contact_group
CREATE OR REPLACE FUNCTION public.create_contact_group(
  group_name TEXT,
  group_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  new_group public.contact_groups%ROWTYPE;
  user_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

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

-- Fix 2: Resolve ambiguous "id" column reference in get_group_members (was db lint error)
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
  SELECT cg.* INTO target_group FROM public.contact_groups cg WHERE cg.id = group_uuid;
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

-- Fix 3: Remove unused user_profile variable from update_profile_across_groups
CREATE OR REPLACE FUNCTION public.update_profile_across_groups(
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
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
