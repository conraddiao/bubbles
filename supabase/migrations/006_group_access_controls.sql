-- Add access control and passcode support for contact groups
ALTER TABLE contact_groups
  ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'open' CHECK (access_type IN ('open','password')),
  ADD COLUMN IF NOT EXISTS join_password_hash TEXT;

-- Track when members depart without deleting their membership history
ALTER TABLE group_memberships
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ;

-- Optimize lookups for active members
CREATE INDEX IF NOT EXISTS idx_group_memberships_active ON group_memberships(group_id) WHERE departed_at IS NULL;
