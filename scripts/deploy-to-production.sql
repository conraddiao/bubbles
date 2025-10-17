-- PRODUCTION DEPLOYMENT SCRIPT
-- Apply all RLS fixes to production Supabase instance
-- Run this in your production Supabase SQL Editor

-- Step 1: Remove all existing problematic policies
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies for contact_groups
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'contact_groups'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON contact_groups', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies for group_memberships
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'group_memberships'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON group_memberships', policy_record.policyname);
    END LOOP;
END $$;

-- Step 2: Create non-recursive RLS policies for contact_groups
CREATE POLICY "Users can view own groups" ON contact_groups
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own groups" ON contact_groups
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own groups" ON contact_groups
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own groups" ON contact_groups
FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Public can view groups by share token" ON contact_groups
FOR SELECT USING (share_token IS NOT NULL);

-- Step 3: Create non-recursive RLS policies for group_memberships
CREATE POLICY "Users can view own memberships" ON group_memberships
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert memberships to public groups" ON group_memberships
FOR INSERT WITH CHECK (
    user_id = auth.uid() AND 
    group_id IN (SELECT id FROM contact_groups WHERE share_token IS NOT NULL)
);

CREATE POLICY "Group owners can manage memberships" ON group_memberships
FOR ALL USING (
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can delete own memberships" ON group_memberships
FOR DELETE USING (user_id = auth.uid());

-- Step 4: Fix the create_contact_group function
CREATE OR REPLACE FUNCTION create_contact_group(
  group_name TEXT,
  group_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Add the owner as the first member using correct column names
  INSERT INTO group_memberships (group_id, user_id, first_name, last_name, email, phone, notifications_enabled)
  VALUES (
    new_group_id, 
    auth.uid(), 
    COALESCE(user_profile.first_name, ''),
    COALESCE(user_profile.last_name, ''),
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
$$;

-- Step 5: Verify everything is working
SELECT 
    'Policies created successfully' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('contact_groups', 'group_memberships');

-- Show all policies for verification
SELECT 
    schemaname, 
    tablename, 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN ('contact_groups', 'group_memberships', 'profiles')
ORDER BY tablename, policyname;