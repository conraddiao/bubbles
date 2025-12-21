-- Ensure auth trigger functions reference the public schema explicitly
-- This prevents search_path differences from breaking profile creation during signup

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    phone_verified,
    two_factor_enabled,
    sms_notifications_enabled
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    FALSE,
    FALSE,
    TRUE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.contact_groups 
  SET owner_id = (
    SELECT user_id 
    FROM public.group_memberships 
    WHERE group_id = public.contact_groups.id 
      AND user_id != OLD.id 
      AND user_id IS NOT NULL
    LIMIT 1
  )
  WHERE owner_id = OLD.id;

  DELETE FROM public.contact_groups 
  WHERE owner_id IS NULL;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
