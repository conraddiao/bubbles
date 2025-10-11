-- Migration: Remove full_name fields after successful migration to first_name/last_name
-- Run this AFTER confirming the migration worked correctly

-- Remove full_name column from group_memberships table
ALTER TABLE group_memberships 
DROP COLUMN IF EXISTS full_name;

-- Remove full_name column from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS full_name;

-- Update any remaining database functions or views that might reference full_name
-- This is a cleanup step to ensure no references to the old field remain