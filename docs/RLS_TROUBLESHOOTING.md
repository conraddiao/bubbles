# Row Level Security (RLS) Troubleshooting Guide

This guide helps troubleshoot common issues when re-enabling RLS on the Shared Contact Groups application.

## Quick Diagnosis

### 1. Profile Fetch Timeout Issues

**Symptoms:**
- "Profile fetch timed out after X seconds" in console
- Infinite loading on login
- "Connection timeout" error messages

**Causes & Solutions:**

#### A. RLS Policies Blocking Access
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'contact_groups', 'group_memberships');

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'contact_groups', 'group_memberships');
```

**Fix:** Ensure the service role policy exists:
```sql
CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

#### B. Missing Profile Records
**Fix:** The auth trigger should create profiles automatically, but if it's not working:
```sql
-- Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- Manually create missing profiles
INSERT INTO profiles (id, email, first_name, last_name, phone_verified, two_factor_enabled, sms_notifications_enabled)
SELECT id, email, 
       COALESCE(raw_user_meta_data->>'first_name', ''),
       COALESCE(raw_user_meta_data->>'last_name', ''),
       false, false, true
FROM auth.users 
WHERE id NOT IN (SELECT id FROM profiles);
```

#### C. Network/Connection Issues
**Fix:** Implement retry logic and better error handling (already done in auth-service.ts)

### 2. Authentication Flow Issues

**Symptoms:**
- Users can't see their own groups
- "Not authenticated" errors
- Groups showing as empty

**Diagnosis:**
```javascript
// Test in browser console
const { data: { user } } = await supabase.auth.getUser()
console.log('Current user:', user)

const { data: profile } = await supabase.from('profiles').select('*').single()
console.log('Profile access:', profile)

const { data: groups } = await supabase.from('contact_groups').select('*')
console.log('Groups access:', groups)
```

**Solutions:**

#### A. JWT Token Issues
```javascript
// Check JWT payload
const { data: { session } } = await supabase.auth.getSession()
if (session) {
  const payload = JSON.parse(atob(session.access_token.split('.')[1]))
  console.log('JWT payload:', payload)
}
```

#### B. Policy Logic Errors
Common policy issues:
- Using `auth.uid()` when user is not authenticated
- Circular references in policy conditions
- Missing indexes causing slow queries

### 3. Group Access Issues

**Symptoms:**
- Users can't see groups they own
- Members can't see group details
- Anonymous users can't join groups

**Solutions:**

#### A. Check Group Ownership
```sql
-- Verify group ownership
SELECT cg.id, cg.name, cg.owner_id, p.email as owner_email
FROM contact_groups cg
JOIN profiles p ON cg.owner_id = p.id
WHERE cg.owner_id = 'USER_ID_HERE';
```

#### B. Check Membership Records
```sql
-- Verify memberships
SELECT gm.*, cg.name as group_name
FROM group_memberships gm
JOIN contact_groups cg ON gm.group_id = cg.id
WHERE gm.user_id = 'USER_ID_HERE';
```

#### C. Anonymous Access Issues
For anonymous users joining groups, ensure:
1. Service role key is set correctly
2. Public policies allow share_token access
3. CORS is configured properly

## Step-by-Step RLS Re-enablement

### 1. Backup Current State
```bash
# Export current data
supabase db dump --data-only > backup.sql
```

### 2. Apply RLS Migration
```bash
# Run the RLS migration
./scripts/enable-rls.sh
```

### 3. Test Each Component

#### A. Test Profile Access
```javascript
// Should work for authenticated users
const { data: profile } = await supabase.from('profiles').select('*').single()
```

#### B. Test Group Creation
```javascript
// Should work for authenticated users
const { data: group } = await supabase.from('contact_groups').insert({
  name: 'Test Group',
  owner_id: user.id
}).select().single()
```

#### C. Test Anonymous Group Access
```javascript
// Should work with share_token
const { data: group } = await supabase.from('contact_groups')
  .select('*')
  .eq('share_token', 'SHARE_TOKEN_HERE')
  .single()
```

### 4. Performance Optimization

#### A. Add Missing Indexes
```sql
-- Optimize RLS policy performance
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_group ON group_memberships(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_owner ON contact_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_share_token ON contact_groups(share_token);
```

#### B. Monitor Query Performance
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
```

## Common Error Messages

### "Profile fetch timed out"
- **Cause:** RLS blocking profile access or network issues
- **Fix:** Check RLS policies and implement retry logic

### "Invalid group link or group not found"
- **Cause:** RLS blocking public access to groups
- **Fix:** Ensure public policy for share_token access exists

### "You do not have permission to perform this action"
- **Cause:** RLS policy blocking legitimate access
- **Fix:** Review and update policy conditions

### "Connection timeout"
- **Cause:** Network issues or slow queries
- **Fix:** Implement timeouts and retry logic

## Monitoring and Maintenance

### 1. Set Up Monitoring
```sql
-- Create a monitoring view
CREATE VIEW rls_policy_usage AS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public';
```

### 2. Regular Health Checks
```javascript
// Health check function
async function healthCheck() {
  const checks = {
    auth: false,
    profile: false,
    groups: false
  }
  
  try {
    // Test auth
    const { data: { user } } = await supabase.auth.getUser()
    checks.auth = !!user
    
    if (user) {
      // Test profile access
      const { data: profile } = await supabase.from('profiles').select('*').single()
      checks.profile = !!profile
      
      // Test groups access
      const { data: groups } = await supabase.from('contact_groups').select('*')
      checks.groups = Array.isArray(groups)
    }
  } catch (error) {
    console.error('Health check failed:', error)
  }
  
  return checks
}
```

### 3. Performance Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE query LIKE '%profiles%' OR query LIKE '%contact_groups%'
ORDER BY mean_time DESC
LIMIT 10;
```

## Emergency Rollback

If RLS causes critical issues:

### 1. Disable RLS Temporarily
```sql
-- Emergency disable (use with caution)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships DISABLE ROW LEVEL SECURITY;
```

### 2. Restore from Backup
```bash
# Restore data if needed
supabase db reset
psql -f backup.sql
```

### 3. Gradual Re-enablement
Enable RLS on one table at a time to isolate issues:
1. Start with `profiles`
2. Then `contact_groups`
3. Finally `group_memberships`

## Getting Help

1. **Check Supabase Logs:** Dashboard → Logs → Database
2. **Browser Console:** Look for detailed error messages
3. **Network Tab:** Check for failed requests
4. **Supabase Community:** Post issues with error details
5. **Documentation:** Review Supabase RLS documentation