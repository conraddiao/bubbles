-- Get group_memberships table columns specifically
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'group_memberships' 
ORDER BY ordinal_position;