-- Fix handle_new_user() to support Google OAuth metadata keys.
-- Google provides given_name/family_name, not first_name/last_name.
-- Email/password signups still use first_name/last_name via options.data.
-- This migration handles both by checking the email/password keys first,
-- then falling back to Google's keys.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    NEW.email,
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
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    FALSE,
    FALSE,
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
