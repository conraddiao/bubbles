#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script applies the database migrations to add first_name and last_name fields
 * and migrate existing full_name data.
 * 
 * Usage:
 * 1. Set your Supabase credentials in environment variables:
 *    SUPABASE_URL=your_supabase_url
 *    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 * 
 * 2. Run the migration:
 *    node database/migrate.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Check for required environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('')
  console.error('Please set these variables and try again.')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...')
    console.log('')
    console.log('⚠️  IMPORTANT: This script will guide you through the migration process.')
    console.log('   You will need to run the SQL commands manually in your Supabase SQL editor.')
    console.log('')
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '001_add_first_last_name_fields.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration SQL to execute:')
    console.log('=' .repeat(80))
    console.log(migrationSQL)
    console.log('=' .repeat(80))
    console.log('')
    console.log('📋 Manual Steps:')
    console.log('1. Copy the SQL above')
    console.log('2. Go to your Supabase project dashboard')
    console.log('3. Navigate to SQL Editor')
    console.log('4. Paste and execute the SQL')
    console.log('5. Verify the migration worked by checking your tables')
    console.log('')
    console.log('🔍 Verification queries to run after migration:')
    console.log('')
    console.log('-- Check if columns were added:')
    console.log('SELECT column_name FROM information_schema.columns')
    console.log('WHERE table_name = \'group_memberships\' AND column_name IN (\'first_name\', \'last_name\');')
    console.log('')
    console.log('-- Check data migration:')
    console.log('SELECT full_name, first_name, last_name FROM group_memberships LIMIT 5;')
    console.log('')
    console.log('-- Test new function:')
    console.log('SELECT * FROM get_group_members(\'your-group-id-here\');')
    console.log('')
    
  } catch (error) {
    console.error('❌ Migration preparation failed:', error.message)
    process.exit(1)
  }
}

async function runCleanup() {
  try {
    console.log('🧹 Starting cleanup migration...')
    
    // Read the cleanup migration SQL file
    const cleanupPath = path.join(__dirname, 'migrations', '002_remove_full_name_fields.sql')
    const cleanupSQL = fs.readFileSync(cleanupPath, 'utf8')
    
    console.log('📄 Cleanup SQL to execute:')
    console.log('=' .repeat(80))
    console.log(cleanupSQL)
    console.log('=' .repeat(80))
    console.log('')
    console.log('📋 Manual Steps:')
    console.log('1. Copy the SQL above')
    console.log('2. Go to your Supabase project dashboard')
    console.log('3. Navigate to SQL Editor')
    console.log('4. Paste and execute the SQL')
    console.log('5. Verify the cleanup worked')
    console.log('')
    console.log('⚠️  WARNING: This will permanently remove the full_name columns!')
    console.log('   Only run this after thoroughly testing your application.')
    
  } catch (error) {
    console.error('❌ Cleanup preparation failed:', error.message)
    process.exit(1)
  }
}

// Check command line arguments
const args = process.argv.slice(2)
if (args.includes('--cleanup')) {
  runCleanup()
} else {
  runMigration()
}