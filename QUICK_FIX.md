# Quick Fix: Add First/Last Name Columns

Since the automated migration script requires manual SQL execution, here's a quick step-by-step fix:

## Step 1: Add Columns to Database

Go to your Supabase project → SQL Editor and run this SQL:

```sql
-- Add columns to group_memberships table
ALTER TABLE group_memberships 
ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';

-- Add columns to profiles table  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
```

## Step 2: Migrate Existing Data

Run the simple data migration script:

```bash
npm run migrate:simple
```

This will:
- Find all records with `full_name` but empty `first_name`/`last_name`
- Split the full names and populate the new columns
- Show you exactly what was migrated

## Step 3: Test Your Application

1. **Check member lists** - Names should display correctly
2. **Test vCard exports** - Should show proper names instead of "undefined undefined"
3. **Try form submissions** - Should work with first/last name fields

## Step 4: Add Constraints (Optional)

After testing, you can add proper constraints:

```sql
-- Make first_name required
ALTER TABLE group_memberships 
ALTER COLUMN first_name SET NOT NULL;

ALTER TABLE profiles
ALTER COLUMN first_name SET NOT NULL;
```

## Step 5: Update Database Functions (Optional)

For full functionality, you may want to update the database functions. Run this SQL:

```sql
-- Update get_group_members function
DROP FUNCTION IF EXISTS get_group_members(uuid);

CREATE OR REPLACE FUNCTION get_group_members(group_uuid uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  notifications_enabled boolean,
  joined_at timestamp with time zone,
  is_owner boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id,
    gm.first_name,
    gm.last_name,
    gm.email,
    gm.phone,
    gm.notifications_enabled,
    gm.joined_at,
    (gm.user_id = cg.owner_id) as is_owner
  FROM group_memberships gm
  JOIN contact_groups cg ON gm.group_id = cg.id
  WHERE gm.group_id = group_uuid
  ORDER BY gm.joined_at ASC;
END;
$$;
```

## Verification

After the migration, test these scenarios:

### 1. Check Data Migration
```sql
SELECT 
  full_name,
  first_name,
  last_name,
  CONCAT(first_name, ' ', last_name) as reconstructed
FROM group_memberships 
WHERE full_name IS NOT NULL
LIMIT 5;
```

### 2. Test vCard Export
1. Go to a group page
2. Click "Export Contacts"
3. Download a contact
4. Import it into your contacts app
5. Verify the name appears correctly (not "undefined undefined")

### 3. Test Forms
1. Try joining a group - should have first/last name fields
2. Try registering - should have first/last name fields
3. Try updating profile - should have first/last name fields

## Rollback (if needed)

If something goes wrong, you can rollback by:

1. **Repopulating full_name** from the new fields:
```sql
UPDATE group_memberships 
SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
WHERE first_name IS NOT NULL;

UPDATE profiles 
SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
WHERE first_name IS NOT NULL;
```

2. **Reverting application code** to use `full_name` (if needed)

## Expected Results

After this quick fix:
- ✅ vCard exports show proper names
- ✅ Member lists display correctly  
- ✅ Forms work with first/last name fields
- ✅ All existing functionality preserved
- ✅ Data is safely migrated with fallbacks