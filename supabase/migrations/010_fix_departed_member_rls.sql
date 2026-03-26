-- Fix RLS policies to exclude departed members from group visibility
--
-- The "Users can view accessible groups" policy was checking group_memberships
-- without filtering out soft-deleted (departed) rows, so users who had left a
-- group could still read contact_groups rows directly via Supabase client.
--
-- Similarly the memberships SELECT policy had the same gap: a departed member
-- could still enumerate other members of a group they'd left.

-- ── contact_groups ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view accessible groups" ON contact_groups;

CREATE POLICY "Users can view accessible groups" ON contact_groups
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT group_id
      FROM group_memberships
      WHERE user_id = auth.uid()
        AND departed_at IS NULL
    )
  );

-- ── group_memberships ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view accessible memberships" ON group_memberships;

CREATE POLICY "Users can view accessible memberships" ON group_memberships
  FOR SELECT USING (
    group_id IN (SELECT id FROM contact_groups WHERE owner_id = auth.uid()) OR
    group_id IN (
      SELECT group_id
      FROM group_memberships
      WHERE user_id = auth.uid()
        AND departed_at IS NULL
    )
  );
