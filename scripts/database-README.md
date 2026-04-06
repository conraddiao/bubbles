# Database Migration: Full Name to First/Last Name

This directory contains the database migration scripts to convert from using a single `full_name` field to separate `first_name` and `last_name` fields in both the `group_memberships` and `profiles` tables.

## Migration Overview

The migration process involves:

1. **Adding new columns**: `first_name` and `last_name` to both tables
2. **Data migration**: Splitting existing `full_name` data into the new columns
3. **Function updates**: Updating database functions to use the new schema
4. **Cleanup**: Removing the old `full_name` columns (optional, after testing)

## Prerequisites

Before running the migration, ensure you have:

1. **Supabase credentials** with sufficient permissions
2. **Node.js** installed (for running the migration script)
3. **Backup** of your database (recommended)

## Environment Variables

Set the following environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Running the Migration

### Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

### Step 2: Run the Main Migration

```bash
node database/migrate.js
```

This will:
- Add `first_name` and `last_name` columns
- Migrate existing data from `full_name` to the new columns
- Update database functions
- Keep the old `full_name` columns for safety

### Step 3: Test Your Application

After running the migration, thoroughly test your application to ensure:
- Names display correctly in the UI
- vCard exports work properly
- Form submissions work with first/last name fields
- All existing functionality continues to work

### Step 4: Cleanup (Optional)

Once you've confirmed everything works correctly, you can remove the old `full_name` columns:

```bash
node database/migrate.js --cleanup
```

⚠️ **Warning**: This step is irreversible. Only run cleanup after thorough testing.

## Manual Migration (Alternative)

If you prefer to run the migration manually, you can execute the SQL files directly in your Supabase SQL editor:

1. Run `migrations/001_add_first_last_name_fields.sql`
2. Test your application
3. Optionally run `migrations/002_remove_full_name_fields.sql`

## Data Migration Logic

The migration splits `full_name` using this logic:

- **If `full_name` contains a space**: 
  - `first_name` = everything before the first space
  - `last_name` = everything after the first space
- **If `full_name` has no spaces**:
  - `first_name` = the entire name
  - `last_name` = empty string

Examples:
- "John Doe" → first_name: "John", last_name: "Doe"
- "Mary Jane Smith" → first_name: "Mary", last_name: "Jane Smith"
- "Madonna" → first_name: "Madonna", last_name: ""

## Rollback

If you need to rollback the migration (before cleanup):

1. The old `full_name` columns are preserved during the initial migration
2. You can revert your application code to use `full_name` again
3. Optionally, you can repopulate `full_name` from `first_name` and `last_name`:

```sql
UPDATE group_memberships 
SET full_name = CONCAT(first_name, ' ', last_name)
WHERE first_name IS NOT NULL;

UPDATE profiles 
SET full_name = CONCAT(first_name, ' ', last_name)
WHERE first_name IS NOT NULL;
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure you're using the service role key, not the anon key
2. **Function Errors**: Some functions may need to be recreated manually
3. **Data Issues**: Check for any records with NULL or empty names

### Verification Queries

After migration, you can verify the data with these queries:

```sql
-- Check group_memberships migration
SELECT 
  full_name,
  first_name,
  last_name,
  CONCAT(first_name, ' ', last_name) as reconstructed
FROM group_memberships 
LIMIT 10;

-- Check profiles migration  
SELECT 
  full_name,
  first_name,
  last_name,
  CONCAT(first_name, ' ', last_name) as reconstructed
FROM profiles 
LIMIT 10;
```

## Support

If you encounter issues during migration:

1. Check the error messages carefully
2. Verify your Supabase credentials and permissions
3. Ensure your database is accessible
4. Consider running the migration during low-traffic periods