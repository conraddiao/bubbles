-- Drop and recreate the create_contact_group function
-- Run this in your Supabase SQL Editor

-- Drop the existing function
DROP FUNCTION IF EXISTS create_contact_group(text, text);

-- Recreate with JSON return type
CREATE OR REPLACE FUNCTION create_contact_group(
  group_name TEXT,
  group_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  new_group_id UUID;
  new_share_token TEXT;
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
  RETURNING id, share_token INTO new_group_id, new_share_token;

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

  -- Return both ID and share token as JSON
  RETURN json_build_object(
    'group_id', new_group_id,
    'share_token', new_share_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;