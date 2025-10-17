-- Test profile access for the specific user
-- Run this in your local Supabase SQL Editor to diagnose the issue

-- Check if the user exists in profiles table
SELECT 'User exists in profiles:' as test, COUNT(*) as count
FROM profiles 
WHERE id = '5babb625-93d5-4ec0-8c27-4d2a11e03237';

-- Check current user context
SELECT 'Current auth user:' as test, auth.uid() as current_user;

-- Test if RLS is blocking the query
SELECT 'Profile query test:' as test, *
FROM profiles 
WHERE id = '5babb625-93d5-4ec0-8c27-4d2a11e03237';

-- Check RLS policies on profiles
SELECT 'Profiles policies:' as test, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Test raw query without RLS (as admin)
SET row_security = off;
SELECT 'Raw profile data:' as test, *
FROM profiles 
WHERE id = '5babb625-93d5-4ec0-8c27-4d2a11e03237';
SET row_security = on;