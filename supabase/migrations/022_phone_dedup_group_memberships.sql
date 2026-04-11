-- Phone-number normalization and duplicate detection on group_memberships.
--
-- Bubbles already enforces UNIQUE(group_id, email) on group_memberships but
-- has no equivalent for phone, so the same person can join the same group
-- twice by formatting their phone differently (e.g. "(555) 123-4567" vs
-- "+15551234567"). This migration:
--
-- 1. Adds a public.normalize_phone_e164() helper that prepends the '+' prefix
--    when missing (same gap migration 020 fixed for handle_new_user()).
-- 2. Normalizes existing group_memberships.phone values in place.
-- 3. Fails loudly if any (group_id, phone) duplicates exist among active
--    (non-departed) rows — per user decision, no auto-resolution.
-- 4. Creates a partial unique index on active rows only.
-- 5. Rewrites the three write-path RPCs and update_profile_across_groups() to
--    normalize phone and pre-check for duplicates, mirroring the existing
--    email handling.

-- ── 1. normalize_phone_e164 helper ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.normalize_phone_e164(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  trimmed TEXT;
BEGIN
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;

  trimmed := trim(phone_input);
  IF trimmed = '' THEN
    RETURN NULL;
  END IF;

  IF trimmed !~ '^\+' THEN
    trimmed := '+' || trimmed;
  END IF;

  RETURN trimmed;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 2. Backfill existing rows to normalized form ─────────────────────────────

UPDATE public.group_memberships
   SET phone = public.normalize_phone_e164(phone)
 WHERE phone IS NOT NULL
   AND phone IS DISTINCT FROM public.normalize_phone_e164(phone);

-- ── 3. Duplicate detection (fail loudly) ─────────────────────────────────────
-- Only active (non-departed) members are subject to the new constraint, so
-- only flag duplicates among active rows.

DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT group_id, phone
    FROM public.group_memberships
    WHERE phone IS NOT NULL
      AND departed_at IS NULL
    GROUP BY group_id, phone
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'Cannot add phone dedup constraint: % duplicate (group_id, phone) pairs exist among active memberships. Resolve manually before re-running.',
      dup_count;
  END IF;
END $$;

-- ── 4. Partial unique index ──────────────────────────────────────────────────
-- Partial because:
--   * phone is nullable and we must allow multiple NULL phones per group.
--   * Departed members should not block rejoins (matches get_group_members
--     and the RLS policies added in migration 010).

CREATE UNIQUE INDEX IF NOT EXISTS group_memberships_group_id_phone_unique
  ON public.group_memberships (group_id, phone)
  WHERE phone IS NOT NULL AND departed_at IS NULL;

-- ── 5. Rewrite write-path RPCs to normalize + pre-check ──────────────────────

CREATE OR REPLACE FUNCTION public.create_contact_group(
  group_name TEXT,
  group_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  new_group public.contact_groups%ROWTYPE;
  user_profile public.profiles%ROWTYPE;
  normalized_phone TEXT;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please complete your profile first.';
  END IF;

  normalized_phone := public.normalize_phone_e164(user_profile.phone);

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
    normalized_phone,
    user_profile.avatar_url,
    COALESCE(user_profile.sms_notifications_enabled, FALSE)
  );

  RETURN jsonb_build_object(
    'group_id', new_group.id,
    'share_token', new_group.share_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  normalized_phone TEXT;
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
    SELECT 1 FROM public.group_memberships
    WHERE group_id = target_group.id
      AND user_id = auth.uid()
      AND departed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You are already a member of this group.';
  END IF;

  normalized_phone := public.normalize_phone_e164(user_profile.phone);

  IF normalized_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = target_group.id
      AND phone = normalized_phone
      AND departed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This phone number is already registered in this group.';
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
    normalized_phone,
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
  normalized_phone TEXT;
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
    WHERE group_id = target_group.id
      AND email = trim(lower(member_email))
      AND departed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This email address is already registered in this group.';
  END IF;

  normalized_phone := public.normalize_phone_e164(member_phone);

  IF normalized_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = target_group.id
      AND phone = normalized_phone
      AND departed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'This phone number is already registered in this group.';
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
    normalized_phone,
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

-- update_profile_across_groups: normalize the incoming phone and let the
-- partial unique index act as a safety net. Per product policy (2FA required
-- → phones are unique per verified user), the unique_violation should never
-- fire in practice; if it does, raise a clear actionable error.

CREATE OR REPLACE FUNCTION public.update_profile_across_groups(
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  normalized_new_phone TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  normalized_new_phone := public.normalize_phone_e164(new_phone);

  UPDATE public.profiles
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    phone = COALESCE(normalized_new_phone, phone),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = auth.uid();

  BEGIN
    UPDATE public.group_memberships
    SET
      first_name = COALESCE(new_first_name, first_name),
      last_name = COALESCE(new_last_name, last_name),
      phone = COALESCE(normalized_new_phone, phone),
      avatar_url = COALESCE(new_avatar_url, avatar_url)
    WHERE user_id = auth.uid();
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'This phone number is already in use by another member in one of your groups.';
  END;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
