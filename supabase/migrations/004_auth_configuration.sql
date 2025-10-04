-- Authentication configuration and triggers
-- This migration sets up auth-related triggers and configurations

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO profiles (id, email, full_name, phone_verified, two_factor_enabled, sms_notifications_enabled)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    FALSE,
    FALSE,
    TRUE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Transfer ownership of groups to the first member or delete if no members
  UPDATE contact_groups 
  SET owner_id = (
    SELECT user_id 
    FROM group_memberships 
    WHERE group_id = contact_groups.id 
      AND user_id != OLD.id 
      AND user_id IS NOT NULL
    LIMIT 1
  )
  WHERE owner_id = OLD.id;

  -- Delete groups that have no other members
  DELETE FROM contact_groups 
  WHERE owner_id IS NULL;

  -- The profile will be deleted automatically due to CASCADE

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle cleanup when user is deleted
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_delete();

-- Function to validate phone number format
CREATE OR REPLACE FUNCTION validate_phone_number(phone_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Basic phone number validation (E.164 format)
  -- Allows +1234567890 or similar international formats
  IF phone_input IS NULL OR trim(phone_input) = '' THEN
    RETURN TRUE; -- Allow empty phone numbers
  END IF;
  
  -- Check if phone number matches basic international format
  RETURN phone_input ~ '^\+[1-9]\d{1,14}$';
END;
$$ LANGUAGE plpgsql;

-- Add phone number validation constraint
ALTER TABLE profiles 
ADD CONSTRAINT valid_phone_format 
CHECK (validate_phone_number(phone));

ALTER TABLE group_memberships 
ADD CONSTRAINT valid_phone_format 
CHECK (validate_phone_number(phone));

-- Function to generate secure share tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to regenerate share token for a group
CREATE OR REPLACE FUNCTION regenerate_group_token(group_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  target_group contact_groups%ROWTYPE;
BEGIN
  -- Get the group
  SELECT * INTO target_group FROM contact_groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  -- Check if user is the owner
  IF target_group.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the group owner can regenerate the share token.';
  END IF;

  -- Generate new token
  new_token := generate_share_token();
  
  -- Update the group
  UPDATE contact_groups 
  SET share_token = new_token, updated_at = NOW()
  WHERE id = group_uuid;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for group statistics (accessible to group owners)
CREATE OR REPLACE VIEW group_stats AS
SELECT 
  cg.id,
  cg.name,
  cg.owner_id,
  cg.is_closed,
  cg.created_at,
  COUNT(gm.id) as member_count,
  COUNT(CASE WHEN gm.notifications_enabled THEN 1 END) as notification_subscribers,
  COUNT(CASE WHEN gm.phone IS NOT NULL THEN 1 END) as members_with_phone,
  MAX(gm.joined_at) as last_member_joined
FROM contact_groups cg
LEFT JOIN group_memberships gm ON cg.id = gm.group_id
GROUP BY cg.id, cg.name, cg.owner_id, cg.is_closed, cg.created_at;

-- Grant access to the view
GRANT SELECT ON group_stats TO authenticated;

-- RLS policy for group stats (owners can see their group stats)
ALTER VIEW group_stats SET (security_barrier = true);
CREATE POLICY "Owners can view group stats" ON group_stats
  FOR SELECT USING (owner_id = auth.uid());