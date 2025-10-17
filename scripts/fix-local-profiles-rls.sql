-- Fix profiles table RLS policies in local database
-- This should match what you have in production

-- First, drop all existing policies on profiles
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Create the correct policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can delete own profile" ON profiles
FOR DELETE USING (id = auth.uid());

-- Verify the policies work
SELECT 'Testing profile access with RLS:' as test;
SELECT * FROM profiles WHERE id = auth.uid();

-- Show all policies
SELECT 'Profiles policies created:' as status, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';