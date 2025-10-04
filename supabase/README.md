# Supabase Database Setup

This directory contains the database schema, migrations, and configuration for the Shared Contact Groups application.

## Database Schema Overview

The database consists of 5 main tables:

1. **profiles** - User profiles extending Supabase auth.users
2. **contact_groups** - Contact groups created by users
3. **group_memberships** - Members belonging to contact groups
4. **notification_events** - Log of group events for notifications
5. **sms_notifications** - SMS/MMS notification tracking

## Setup Instructions

### Local Development with Supabase CLI

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project (if not already done):
   ```bash
   supabase init
   ```

3. Start the local Supabase stack:
   ```bash
   supabase start
   ```

4. Apply the migrations:
   ```bash
   supabase db reset
   ```

5. The local Supabase instance will be available at:
   - API URL: http://localhost:54321
   - Database URL: postgresql://postgres:postgres@localhost:54322/postgres
   - Studio URL: http://localhost:54323

### Production Setup

1. Create a new Supabase project at https://supabase.com

2. Link your local project to the remote project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Push the migrations to production:
   ```bash
   supabase db push
   ```

## Environment Variables

Make sure to set these environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Functions

The schema includes several custom functions for group management:

- `create_contact_group(name, description)` - Create a new contact group
- `join_contact_group(token, notifications)` - Join a group (authenticated users)
- `join_contact_group_anonymous(token, name, email, phone, notifications)` - Join a group (anonymous users)
- `remove_group_member(membership_id)` - Remove a member from a group
- `close_contact_group(group_id)` - Close a group and trigger notifications
- `get_group_members(group_id)` - Get all members of a group
- `update_profile_across_groups(name, phone)` - Update user info across all groups

## Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

- Users can only access their own profiles
- Users can only see groups they own or are members of
- Group owners have full control over their groups
- Members can view other members' contact information
- Anonymous users can join groups via share tokens (handled by service role)

## Testing the Schema

You can test the database functions using the Supabase SQL editor or by connecting to the local database:

```sql
-- Test creating a group (after authenticating a user)
SELECT create_contact_group('Test Group', 'A test group for development');

-- Test joining a group anonymously
SELECT join_contact_group_anonymous('share_token_here', 'John Doe', 'john@example.com', '+1234567890', true);
```

## Migration Files

- `001_initial_schema.sql` - Core tables and indexes
- `002_rls_policies.sql` - Row Level Security policies
- `003_database_functions.sql` - Custom functions for group management
- `004_auth_configuration.sql` - Authentication triggers and utilities

## Notes

- The schema is designed to work with Supabase Auth for user management
- Phone numbers are validated using E.164 format
- Share tokens are automatically generated using secure random bytes
- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- Indexes are created for optimal query performance