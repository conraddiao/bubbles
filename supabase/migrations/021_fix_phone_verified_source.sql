-- Fix: phone_verified should derive from the normalized _phone variable,
-- not from NEW.phone, so it's true when phone comes from raw_user_meta_data.

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
