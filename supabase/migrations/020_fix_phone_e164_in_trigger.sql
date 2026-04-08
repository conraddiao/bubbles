-- Fix: Supabase GoTrue stores auth.users.phone without the '+' prefix
-- (e.g. '15005550006' instead of '+15005550006'). The handle_new_user()
-- trigger must normalize to E.164 before inserting into profiles.phone,
-- which has a CHECK constraint requiring the '+' prefix.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _phone TEXT;
BEGIN
  -- Normalize phone to E.164: GoTrue strips the '+' prefix from auth.users.phone
  _phone := COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL);
  IF _phone IS NOT NULL AND _phone !~ '^\+' THEN
    _phone := '+' || _phone;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    phone_verified,
    two_factor_enabled,
    sms_notifications_enabled
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
      NEW.raw_user_meta_data->>'given_name',
      ''
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.raw_user_meta_data->>'family_name',
      ''
    ),
    _phone,
    CASE WHEN _phone IS NOT NULL THEN TRUE ELSE FALSE END,
    FALSE,
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
