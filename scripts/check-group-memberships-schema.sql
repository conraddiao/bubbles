-- Check the current schema of group_memberships table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'group_memberships' 
ORDER BY ordinal_position;

-- Also check if the create_contact_group function exists and what it does
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_contact_group';