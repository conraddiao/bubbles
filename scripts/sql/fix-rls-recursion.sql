-- Fix RLS infinite recursion by simplifying policies
-- This script removes the circular references causing the recursion

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view accessible groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can view accessible memberships" ON group_memberships;
DROP POLICY IF EXISTS "Public can view memberships for accessible groups" ON group_memberships;

-- Create simplified, non-recursive policies for contact_groups
CREATE POLICY "Users can view own groups" ON contact_groups
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Public can view groups by share token" ON contact_groups
  FOR SELECT USING (share_token IS NOT NULL);

-- Create simplified policies for group_memberships
CREATE POLICY "Users can view own memberships" ON group_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Group owners can view their group memberships" ON group_memberships
  FOR SELECT USING (
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Public can view memberships for public groups" ON group_memberships
  FOR SELECT USING (
    group_id IN (SELECT id FROM contact_groups WHERE share_token IS NOT NULL)
  );

-- Verify the policies are working
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('contact_groups', 'group_memberships')
ORDER BY tablename, policyname;