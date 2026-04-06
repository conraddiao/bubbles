-- Drop full_name columns after migration is complete
-- Run this ONLY after confirming the migration worked correctly

-- Drop full_name column from group_memberships table
ALTER TABLE group_memberships 
DROP COLUMN IF EXISTS full_name;

-- Drop full_name column from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS full_name;

-- Verification queries to run after dropping columns
-- These should NOT return any full_name columns:

-- Check group_memberships columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'group_memberships' 
ORDER BY ordinal_position;

-- Check profiles columns  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;