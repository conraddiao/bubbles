-- Replace long share tokens with short 6-char lowercase alpha codes
-- Affects new group creation, token regeneration, and backfills existing groups

-- Step 1: Core unique short code generator
CREATE OR REPLACE FUNCTION generate_unique_share_code()
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := 'abcdefghijklmnopqrstuvwxyz';
  code TEXT;
  attempts INT := 0;
  max_attempts INT := 100;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, floor(random() * 26 + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.contact_groups WHERE share_token = code
    );
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique share code after % attempts', max_attempts;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Replace generate_share_token() so regenerate_group_token() also produces short codes
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN generate_unique_share_code();
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update column default
ALTER TABLE public.contact_groups
  ALTER COLUMN share_token SET DEFAULT generate_unique_share_code();

-- Step 4: BEFORE INSERT trigger (belt-and-suspenders for direct inserts)
CREATE OR REPLACE FUNCTION ensure_short_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL OR length(NEW.share_token) > 8 THEN
    NEW.share_token := generate_unique_share_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contact_groups_share_code
  BEFORE INSERT ON public.contact_groups
  FOR EACH ROW EXECUTE FUNCTION ensure_short_share_code();

-- Step 5: Backfill existing long-token rows (row-by-row for uniqueness safety)
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
BEGIN
  FOR rec IN
    SELECT id FROM public.contact_groups
    WHERE length(share_token) > 8
    ORDER BY created_at ASC
  LOOP
    new_code := generate_unique_share_code();
    UPDATE public.contact_groups
      SET share_token = new_code, updated_at = NOW()
      WHERE id = rec.id;
  END LOOP;
END $$;
