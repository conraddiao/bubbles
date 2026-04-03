-- Change sms_notifications_enabled to default FALSE (explicit opt-in)
-- and update the profile creation trigger to read the value from user metadata.

ALTER TABLE public.profiles
  ALTER COLUMN sms_notifications_enabled SET DEFAULT FALSE;

-- Update handle_new_user() to read sms_notifications_enabled from signup metadata
-- so the user's explicit choice during sign-up is persisted to their profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
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
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    FALSE,
    FALSE,
    COALESCE((NEW.raw_user_meta_data->>'sms_notifications_enabled')::boolean, FALSE)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
