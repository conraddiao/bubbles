-- Fix RLS infinite recursion between contact_groups and group_memberships
-- This migration replaces recursive policies with helper functions that run as security definer.

-- Drop existing policies that reference each other
DROP POLICY IF EXISTS "Users can view accessible groups" ON contact_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON contact_groups;
DROP POLICY IF EXISTS "Owners can update their groups" ON contact_groups;
DROP POLICY IF EXISTS "Owners can delete their groups" ON contact_groups;
DROP POLICY IF EXISTS "Service role can manage groups" ON contact_groups;
DROP POLICY IF EXISTS "Public can view groups by share token" ON contact_groups;

DROP POLICY IF EXISTS "Users can view accessible memberships" ON group_memberships;
DROP POLICY IF EXISTS "Public can view memberships for accessible groups" ON group_memberships;
DROP POLICY IF EXISTS "Users can join groups or owners can add members" ON group_memberships;
DROP POLICY IF EXISTS "Users can update accessible memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can leave or owners can remove members" ON group_memberships;
DROP POLICY IF EXISTS "Service role can manage memberships" ON group_memberships;

-- Helper functions executed without RLS to avoid recursion
CREATE OR REPLACE FUNCTION user_is_group_owner(group_uuid uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM contact_groups cg
    WHERE cg.id = group_uuid
      AND cg.owner_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_is_group_member(group_uuid uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM group_memberships gm
    WHERE gm.group_id = group_uuid
      AND gm.user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_can_access_group(group_uuid uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN user_is_group_owner(group_uuid) OR user_is_group_member(group_uuid);
END;
$$;

CREATE OR REPLACE FUNCTION group_is_public(group_uuid uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM contact_groups cg
    WHERE cg.id = group_uuid
      AND cg.share_token IS NOT NULL
  );
END;
$$;

-- Recreate contact_groups policies without recursive subqueries
CREATE POLICY "Users can view accessible groups" ON contact_groups
  FOR SELECT USING (
    user_can_access_group(id) OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Authenticated users can create groups" ON contact_groups
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
  );

CREATE POLICY "Owners can update their groups" ON contact_groups
  FOR UPDATE USING (
    user_is_group_owner(id) OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Owners can delete their groups" ON contact_groups
  FOR DELETE USING (
    user_is_group_owner(id) OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can manage groups" ON contact_groups
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Recreate group_memberships policies leveraging helper functions
CREATE POLICY "Users can view accessible memberships" ON group_memberships
  FOR SELECT USING (
    user_can_access_group(group_id)
    OR group_is_public(group_id)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can join groups or owners can add members" ON group_memberships
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR user_is_group_owner(group_id)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can update accessible memberships" ON group_memberships
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR user_is_group_owner(group_id)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Users can leave or owners can remove members" ON group_memberships
  FOR DELETE USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR user_is_group_owner(group_id)
    OR auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Service role can manage memberships" ON group_memberships
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow anonymous read access for public groups via share token
CREATE POLICY "Public can view groups by share token" ON contact_groups
  FOR SELECT USING (share_token IS NOT NULL);

CREATE POLICY "Public can view memberships for accessible groups" ON group_memberships
  FOR SELECT USING (
    group_is_public(group_id)
  );
