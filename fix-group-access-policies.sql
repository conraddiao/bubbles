-- Fix group access policies to allow owners to view their groups
-- Run this in your Supabase SQL Editor

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view own groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON contact_groups;

-- Create a single, simple policy for group access
CREATE POLICY "Users can access their groups" ON contact_groups
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM group_memberships 
      WHERE group_id = contact_groups.id 
      AND user_id = auth.uid()
    )
  );