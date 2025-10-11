-- Re-enable Row Level Security with improved policies
-- This migration re-enables RLS that was temporarily disabled for development

-- First, drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can create groups" ON contact_groups;
DROP POLICY IF EXISTS "Owners can update groups" ON contact_groups;
DROP POLICY IF EXISTS "Owners can delete groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can join groups" ON group_memberships;
DROP POLICY IF EXISTS "Users can update memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can leave groups" ON group_memberships;

-- Re-enable RLS on the tables that were disabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- Improved Profiles policies
-- Users can view and manage their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow service role to manage profiles (for auth triggers)
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Improved Contact Groups policies
-- Users can view groups they own or are members of
CREATE POLICY "Users can view accessible groups" ON contact_groups
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

-- Allow public access to groups by share_token for anonymous joins
CREATE POLICY "Public can view groups by share token" ON contact_groups
  FOR SELECT USING (share_token IS NOT NULL);

-- Only authenticated users can create groups
CREATE POLICY "Authenticated users can create groups" ON contact_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Only group owners can update their groups
CREATE POLICY "Owners can update their groups" ON contact_groups
  FOR UPDATE USING (owner_id = auth.uid());

-- Only group owners can delete their groups
CREATE POLICY "Owners can delete their groups" ON contact_groups
  FOR DELETE USING (owner_id = auth.uid());

-- Service role can manage all groups (for anonymous operations)
CREATE POLICY "Service role can manage groups" ON contact_groups
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Improved Group Memberships policies
-- Users can view memberships for groups they have access to
CREATE POLICY "Users can view accessible memberships" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    group_id IN (SELECT group_id FROM group_memberships WHERE user_id = auth.uid())
  );

-- Allow public viewing of memberships by group share token (for anonymous joins)
CREATE POLICY "Public can view memberships for accessible groups" ON group_memberships
  FOR SELECT USING (
    group_id IN (SELECT id FROM contact_groups WHERE share_token IS NOT NULL)
  );

-- Users can join groups (authenticated) or group owners can add members
CREATE POLICY "Users can join groups or owners can add members" ON group_memberships
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Users can update their own memberships or group owners can manage memberships
CREATE POLICY "Users can update accessible memberships" ON group_memberships
  FOR UPDATE USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Users can leave groups or group owners can remove members
CREATE POLICY "Users can leave or owners can remove members" ON group_memberships
  FOR DELETE USING (
    user_id = auth.uid() OR
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Service role can manage all memberships (for anonymous operations)
CREATE POLICY "Service role can manage memberships" ON group_memberships
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create optimized helper functions for better performance
CREATE OR REPLACE FUNCTION user_can_access_group(group_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is owner or member
  RETURN EXISTS (
    SELECT 1 FROM contact_groups 
    WHERE id = group_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM group_memberships 
    WHERE group_id = group_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create index to optimize RLS policy performance
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_group ON group_memberships(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_owner ON contact_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_memberships TO authenticated;
GRANT SELECT ON contact_groups TO anon;
GRANT SELECT ON group_memberships TO anon;