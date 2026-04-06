-- Completely fix the infinite recursion by using simpler policies
-- Run this in your Supabase SQL Editor

-- Drop ALL existing policies that cause recursion
DROP POLICY IF EXISTS "Users can access their groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can view own groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON contact_groups;
DROP POLICY IF EXISTS "Users can view memberships of their own groups" ON group_memberships;
DROP POLICY IF EXISTS "Users can view their own memberships" ON group_memberships;

-- Create simple, non-recursive policies

-- For contact_groups: Only allow owners to see their groups
CREATE POLICY "Owners can view their groups" ON contact_groups
  FOR SELECT USING (owner_id = auth.uid());

-- For group_memberships: Allow viewing based on direct ownership or membership
CREATE POLICY "View group memberships" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid() OR 
    group_id IN (
      SELECT id FROM contact_groups WHERE owner_id = auth.uid()
    )
  );

-- Alternative: Temporarily disable RLS for testing (ONLY for development)
-- You can uncomment these lines if the above still causes issues:
-- ALTER TABLE contact_groups DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE group_memberships DISABLE ROW LEVEL SECURITY;