-- Migration: Add first_name and last_name fields to group_memberships and profiles tables
-- This migration splits the full_name field into first_name and last_name

-- Step 1: Add new columns to group_memberships table
ALTER TABLE group_memberships 
ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';

-- Step 2: Add new columns to profiles table  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';

-- Step 3: Migrate existing data from full_name to first_name and last_name in group_memberships
UPDATE group_memberships 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0 
    THEN trim(substring(full_name from 1 for position(' ' in full_name) - 1))
    WHEN full_name IS NOT NULL AND full_name != ''
    THEN trim(full_name)
    ELSE ''
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0 
    THEN trim(substring(full_name from position(' ' in full_name) + 1))
    ELSE ''
  END
WHERE (first_name IS NULL OR first_name = '') AND (last_name IS NULL OR last_name = '');

-- Step 4: Migrate existing data from full_name to first_name and last_name in profiles
UPDATE profiles 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0 
    THEN trim(substring(full_name from 1 for position(' ' in full_name) - 1))
    WHEN full_name IS NOT NULL AND full_name != ''
    THEN trim(full_name)
    ELSE ''
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0 
    THEN trim(substring(full_name from position(' ' in full_name) + 1))
    ELSE ''
  END
WHERE (first_name IS NULL OR first_name = '') AND (last_name IS NULL OR last_name = '');

-- Step 5: Set NOT NULL constraints on the new fields (after data migration)
ALTER TABLE group_memberships 
ALTER COLUMN first_name SET NOT NULL;

-- Note: We'll keep last_name nullable since some people might only have first names
-- But we'll set a default value
ALTER TABLE group_memberships 
ALTER COLUMN last_name SET DEFAULT '';

-- Step 6: For profiles, we'll also set constraints
ALTER TABLE profiles
ALTER COLUMN first_name SET NOT NULL;

ALTER TABLE profiles
ALTER COLUMN last_name SET DEFAULT '';

-- Step 7: Update database functions that work with member data
-- Drop and recreate the get_group_members function to return first_name and last_name
DROP FUNCTION IF EXISTS get_group_members(uuid);

CREATE OR REPLACE FUNCTION get_group_members(group_uuid uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  notifications_enabled boolean,
  joined_at timestamp with time zone,
  is_owner boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id,
    gm.first_name,
    gm.last_name,
    gm.email,
    gm.phone,
    gm.notifications_enabled,
    gm.joined_at,
    (gm.user_id = cg.owner_id) as is_owner
  FROM group_memberships gm
  JOIN contact_groups cg ON gm.group_id = cg.id
  WHERE gm.group_id = group_uuid
  ORDER BY gm.joined_at ASC;
END;
$$;

-- Step 8: Update the join_contact_group_anonymous function to use first_name and last_name
DROP FUNCTION IF EXISTS join_contact_group_anonymous(text, text, text, text, boolean);

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
  group_id uuid;
  membership_id uuid;
BEGIN
  -- Find the group by share token
  SELECT id INTO group_id
  FROM contact_groups
  WHERE share_token = group_token AND NOT is_closed;
  
  IF group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid group link or group is closed';
  END IF;
  
  -- Check if email already exists in this group
  IF EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = group_id AND email = lower(trim(member_email))
  ) THEN
    RAISE EXCEPTION 'This email address is already registered in this group';
  END IF;
  
  -- Insert new membership
  INSERT INTO group_memberships (
    group_id,
    user_id,
    first_name,
    last_name,
    email,
    phone,
    notifications_enabled
  ) VALUES (
    group_id,
    NULL,
    trim(member_first_name),
    trim(member_last_name),
    lower(trim(member_email)),
    NULLIF(trim(member_phone), ''),
    enable_notifications
  ) RETURNING id INTO membership_id;
  
  RETURN membership_id;
END;
$$;

-- Step 9: Update the update_profile_across_groups function
DROP FUNCTION IF EXISTS update_profile_across_groups(text, text);

CREATE OR REPLACE FUNCTION update_profile_across_groups(
  new_first_name text DEFAULT NULL,
  new_last_name text DEFAULT NULL,
  new_phone text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Update profile
  UPDATE profiles 
  SET 
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    phone = COALESCE(new_phone, phone),
    updated_at = now()
  WHERE id = current_user_id;
  
  -- Update group memberships for this user
  UPDATE group_memberships
  SET
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    phone = COALESCE(new_phone, phone)
  WHERE user_id = current_user_id;
  
  RETURN true;
END;
$$;