-- Fix profiles table RLS - add missing policies
-- The profiles table has RLS enabled but no policies, blocking all access

-- Create policies for profiles table
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can delete own profile" ON profiles
FOR DELETE USING (id = auth.uid());

-- Verify the policies are created
SELECT 
    schemaname, 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;