-- Complete RLS fix: Remove ALL policies and recreate without recursion
-- This script completely cleans up and recreates all RLS policies

-- First, drop ALL existing policies for both tables
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

-- Now create the simplified, non-recursive policies

-- CONTACT_GROUPS policies (no references to group_memberships)
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

-- GROUP_MEMBERSHIPS policies (simplified references to contact_groups)
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