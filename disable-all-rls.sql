-- Disable RLS on all tables for development testing
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_notifications DISABLE ROW LEVEL SECURITY;