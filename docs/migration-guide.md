# Migration Guide: Full Name to First/Last Name

## Overview

This guide explains how to migrate your Shared Contact Groups application from using a single `full_name` field to separate `first_name` and `last_name` fields.

## Problem

The current database schema uses `full_name` in the `group_memberships` table, but the application code has been updated to use `first_name` and `last_name`. This causes vCard exports to show "undefined undefined" for contact names.

## Solution

We need to:
1. Add `first_name` and `last_name` columns to the database
2. Migrate existing `full_name` data to the new columns
3. Update database functions to use the new schema
4. Remove the old `full_name` columns (optional)

## Quick Start (Recommended)

### Option A: Quick Fix (Easiest)

1. **Add columns manually** in Supabase SQL Editor:
   ```sql
   ALTER TABLE group_memberships 
   ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
   ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
   
   ALTER TABLE profiles
   ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '',
   ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
   ```

2. **Set environment variables**:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

3. **Run simple data migration**:
   ```bash
   npm run migrate:simple
   ```

4. **Test your application** - vCard exports should now work correctly!

### Option B: Full Migration (Complete)

1. **Set environment variables** (same as above)

2. **Run the migration guide**:
   ```bash
   npm run migrate
   ```
   This will show you the SQL to run manually in Supabase SQL Editor.

3. **Test your application**

4. **Optional cleanup**:
   ```bash
   npm run migrate:cleanup
   ```

## What the Migration Does

### Database Changes

1. **Adds new columns**:
   - `group_memberships.first_name` (NOT NULL, default '')
   - `group_memberships.last_name` (default '')
   - `profiles.first_name` (NOT NULL, default '')
   - `profiles.last_name` (default '')

2. **Migrates existing data**:
   - Splits `full_name` on the first space
   - `"John Doe"` → `first_name: "John"`, `last_name: "Doe"`
   - `"Madonna"` → `first_name: "Madonna"`, `last_name: ""`

3. **Updates database functions**:
   - `get_group_members()` returns `first_name` and `last_name`
   - `join_contact_group_anonymous()` accepts separate name parameters
   - `update_profile_across_groups()` handles separate name fields

### Application Changes

The application code has been updated to:

1. **Handle both old and new data formats** during transition
2. **Use utility functions** (`src/lib/name-utils.ts`) for name handling
3. **Generate proper vCards** with structured name fields (`N:` field)
4. **Display names consistently** across all components

## Files Changed

### Database
- `database/migrations/001_add_first_last_name_fields.sql` - Main migration
- `database/migrations/002_remove_full_name_fields.sql` - Cleanup migration
- `database/migrate.js` - Migration script
- `database/README.md` - Detailed migration instructions

### Application Code
- `src/lib/name-utils.ts` - Name handling utilities (NEW)
- `src/types/index.ts` - Updated type definitions
- `src/lib/validations.ts` - Updated validation schemas
- `src/lib/database.ts` - Updated database functions
- `src/components/groups/member-list.tsx` - Updated to use name utils
- `src/components/groups/contact-export.tsx` - Fixed vCard generation
- `src/components/groups/contact-form.tsx` - Split name fields
- `src/components/auth/auth-form.tsx` - Split name fields
- `src/components/auth/profile-form.tsx` - Split name fields
- `src/hooks/use-auth.ts` - Updated for separate names
- Various page components updated for name display

## Verification

After migration, verify these work correctly:

### 1. Member List Display
- Names should display as "First Last" format
- Avatars should show correct initials

### 2. vCard Export
- Download a contact and import it into your contacts app
- Name should appear correctly (not "undefined undefined")
- vCard should have proper `FN:` and `N:` fields

### 3. Form Submissions
- Join group form should have separate first/last name fields
- Registration form should have separate first/last name fields
- Profile update form should have separate first/last name fields

### 4. Database Verification
Run these queries in Supabase SQL editor:

```sql
-- Check data migration
SELECT 
  full_name,
  first_name,
  last_name,
  CONCAT(first_name, ' ', last_name) as reconstructed
FROM group_memberships 
WHERE full_name IS NOT NULL
LIMIT 5;

-- Check new function works
SELECT * FROM get_group_members('your-group-id-here');
```

## Rollback Plan

If you need to rollback (before cleanup):

1. **Revert application code** to use `full_name` fields
2. **Repopulate full_name** from new fields:
   ```sql
   UPDATE group_memberships 
   SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
   WHERE first_name IS NOT NULL;
   ```

## Troubleshooting

### Common Issues

1. **"undefined undefined" in vCard**: Migration not run yet
2. **Permission errors**: Check service role key
3. **Function errors**: Functions may need manual recreation
4. **Missing names**: Check for NULL/empty data in source

### Support

If you encounter issues:
1. Check the detailed `database/README.md`
2. Verify environment variables are set correctly
3. Ensure you have service role permissions
4. Run migration during low-traffic periods

## Timeline

1. **Immediate**: Run the main migration
2. **Test thoroughly**: Verify all functionality works
3. **After 1-2 weeks**: Run cleanup migration (optional)

The old `full_name` columns are preserved during the initial migration for safety.