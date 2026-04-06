-- Fix RLS policies to prevent infinite recursion
-- Run this in your Supabase SQL Editor

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;

-- Create simpler, non-recursive policies for contact_groups
CREATE POLICY "Users can view own groups" ON contact_groups
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can view groups they are members of" ON contact_groups
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT group_id 
      FROM group_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Create simpler policies for group_memberships
CREATE POLICY "Users can view memberships of their own groups" ON group_memberships
  FOR SELECT USING (
    group_id IN (
      SELECT id 
      FROM contact_groups 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own memberships" ON group_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Allow public read access to groups via share token (for anonymous joining)
-- This will be handled by the database functions using SECURITY DEFINER