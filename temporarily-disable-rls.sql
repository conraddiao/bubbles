-- Temporarily disable RLS for testing group functionality
-- Run this in your Supabase SQL Editor
-- WARNING: This is for development only!

ALTER TABLE contact_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships DISABLE ROW LEVEL SECURITY;