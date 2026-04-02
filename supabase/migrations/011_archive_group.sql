-- Migration: Add archive support to contact_groups
-- Owners can archive groups to hide them from their dashboard without losing data.
-- Archive is reversible (unlike close). Members are unaffected.

ALTER TABLE contact_groups
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index for active (non-archived) groups — mirrors departed_at pattern on group_memberships
CREATE INDEX IF NOT EXISTS idx_contact_groups_active
  ON contact_groups(owner_id)
  WHERE archived_at IS NULL;

-- archive_contact_group: owner-only, sets archived_at to current timestamp
CREATE OR REPLACE FUNCTION archive_contact_group(group_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
BEGIN
  SELECT * INTO target_group FROM contact_groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF target_group.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the group owner can archive the group.';
  END IF;

  IF target_group.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'Group is already archived.';
  END IF;

  UPDATE contact_groups
    SET archived_at = NOW(), updated_at = NOW()
    WHERE id = group_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- unarchive_contact_group: owner-only, clears archived_at
CREATE OR REPLACE FUNCTION unarchive_contact_group(group_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  target_group contact_groups%ROWTYPE;
BEGIN
  SELECT * INTO target_group FROM contact_groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found.';
  END IF;

  IF target_group.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the group owner can unarchive the group.';
  END IF;

  IF target_group.archived_at IS NULL THEN
    RAISE EXCEPTION 'Group is not archived.';
  END IF;

  UPDATE contact_groups
    SET archived_at = NULL, updated_at = NOW()
    WHERE id = group_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security hardening: add search_path and GRANT for both functions
ALTER FUNCTION public.archive_contact_group(UUID) SET search_path = public;
ALTER FUNCTION public.unarchive_contact_group(UUID) SET search_path = public;

GRANT EXECUTE ON FUNCTION public.archive_contact_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_contact_group(UUID) TO authenticated;

-- Block joining archived groups: update get_group_by_share_token to exclude archived groups
CREATE OR REPLACE FUNCTION public.get_group_by_share_token(group_token TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  is_closed BOOLEAN,
  access_type TEXT,
  join_password_hash TEXT,
  owner_id UUID,
  share_token TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  owner_first_name TEXT,
  owner_last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cg.id,
    cg.name,
    cg.description,
    cg.is_closed,
    cg.access_type,
    cg.join_password_hash,
    cg.owner_id,
    cg.share_token,
    cg.created_at,
    cg.updated_at,
    p.first_name,
    p.last_name
  FROM public.contact_groups cg
  LEFT JOIN public.profiles p ON p.id = cg.owner_id
  WHERE cg.share_token = group_token
    AND cg.archived_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

ALTER FUNCTION public.get_group_by_share_token(TEXT) SET search_path = public;
GRANT EXECUTE ON FUNCTION public.get_group_by_share_token(TEXT) TO anon, authenticated;

-- Index covering the archived groups query (owner_id WHERE archived_at IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_contact_groups_archived
  ON contact_groups(owner_id)
  WHERE archived_at IS NOT NULL;
