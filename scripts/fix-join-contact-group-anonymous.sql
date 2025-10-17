-- Fix the join_contact_group_anonymous function signature to match the app

DROP FUNCTION IF EXISTS join_contact_group_anonymous(
  text,
  text,
  text,
  text,
  boolean
);

CREATE OR REPLACE FUNCTION join_contact_group_anonymous(
  group_token text,
  member_first_name text,
  member_last_name text,
  member_email text,
  member_phone text DEFAULT NULL,
  enable_notifications boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
  membership_id uuid;
BEGIN
  SELECT * INTO target_group
  FROM contact_groups
  WHERE share_token = group_token
    AND NOT is_closed;

  IF target_group.id IS NULL THEN
    RAISE EXCEPTION 'Invalid group link or group is closed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE group_id = target_group.id
      AND email = lower(trim(member_email))
  ) THEN
    RAISE EXCEPTION 'This email address is already registered in this group';
  END IF;

  INSERT INTO group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    notifications_enabled
  )
  VALUES (
    target_group.id,
    NULL,
    trim(member_first_name),
    trim(member_last_name),
    lower(trim(member_email)),
    NULLIF(trim(member_phone), ''),
    enable_notifications
  )
  RETURNING id INTO membership_id;

  RETURN membership_id;
END;
$$;
