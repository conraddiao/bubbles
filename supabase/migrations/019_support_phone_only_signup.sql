-- Support phone-only signups (MMS onboarding flow).
-- Phone-first users authenticate via OTP and have no email at signup time.
-- The email is collected later on the profile completion page.

-- 1. Allow NULL email on profiles (phone-only users won't have one initially)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN email SET DEFAULT '';

-- 2. Update the trigger to handle phone-only users gracefully
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
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL),
    CASE WHEN NEW.phone IS NOT NULL THEN TRUE ELSE FALSE END,
    FALSE,
    TRUE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
