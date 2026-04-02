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
