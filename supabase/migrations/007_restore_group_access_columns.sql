-- Ensure group access control columns exist for share links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_groups'
      AND column_name = 'access_type'
  ) THEN
    ALTER TABLE public.contact_groups
      ADD COLUMN access_type TEXT;
  END IF;

  UPDATE public.contact_groups
  SET access_type = 'open'
  WHERE access_type IS NULL;

  ALTER TABLE public.contact_groups
    ALTER COLUMN access_type SET DEFAULT 'open';

  ALTER TABLE public.contact_groups
    ALTER COLUMN access_type SET NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contact_groups_access_type_check'
  ) THEN
    ALTER TABLE public.contact_groups
      ADD CONSTRAINT contact_groups_access_type_check
        CHECK (access_type IN ('open', 'password'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contact_groups'
      AND column_name = 'join_password_hash'
  ) THEN
    ALTER TABLE public.contact_groups
      ADD COLUMN join_password_hash TEXT;
  END IF;
END $$;
