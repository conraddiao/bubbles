#!/usr/bin/env node

/**
 * Final Cleanup Script - Drop full_name columns
 * 
 * This script drops the full_name columns from both tables after migration is complete.
 * 
 * IMPORTANT: Only run this AFTER confirming:
 * 1. The migration worked correctly
 * 2. All names display properly in the UI
 * 3. vCard exports work correctly
 * 4. All functionality is working as expected
 */

const { createClient } = require('@supabase/supabase-js')

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

async function verifyMigration() {
  try {
    console.log('🔍 Verifying migration before cleanup...')
    
    // Check that first_name and last_name columns exist and have data
    const { data: memberships, error: memberError } = await supabase
      .from('group_memberships')
      .select('id, first_name, last_name')
      .not('first_name', 'is', null)
      .limit(5)
    
    if (memberError) {
      console.error('❌ Error checking group_memberships:', memberError)
      return false
    }
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .not('first_name', 'is', null)
      .limit(5)
    
    if (profileError) {
      console.error('❌ Error checking profiles:', profileError)
      return false
    }
    
    console.log(`✅ Found ${memberships?.length || 0} group memberships with first_name data`)
    console.log(`✅ Found ${profiles?.length || 0} profiles with first_name data`)
    
    if ((memberships?.length || 0) === 0 && (profiles?.length || 0) === 0) {
      console.error('❌ No data found with first_name/last_name. Migration may not be complete.')
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

async function dropFullNameColumns() {
  try {
    console.log('🗑️  Dropping full_name columns...')
    console.log('')
    console.log('⚠️  FINAL WARNING: This will permanently remove the full_name columns!')
    console.log('   Make sure you have tested your application thoroughly.')
    console.log('')
    console.log('📋 SQL that needs to be executed:')
    console.log('=' .repeat(60))
    console.log('-- Drop full_name column from group_memberships table')
    console.log('ALTER TABLE group_memberships DROP COLUMN IF EXISTS full_name;')
    console.log('')
    console.log('-- Drop full_name column from profiles table')
    console.log('ALTER TABLE profiles DROP COLUMN IF EXISTS full_name;')
    console.log('=' .repeat(60))
    console.log('')
    console.log('📋 Manual Steps:')
    console.log('1. Copy the SQL above')
    console.log('2. Go to your Supabase project dashboard')
    console.log('3. Navigate to SQL Editor')
    console.log('4. Paste and execute the SQL')
    console.log('5. Verify the columns were dropped')
    console.log('')
    console.log('🔍 Verification queries to run after dropping columns:')
    console.log('')
    console.log('-- Check group_memberships columns (should NOT include full_name):')
    console.log('SELECT column_name FROM information_schema.columns')
    console.log('WHERE table_name = \'group_memberships\' ORDER BY ordinal_position;')
    console.log('')
    console.log('-- Check profiles columns (should NOT include full_name):')
    console.log('SELECT column_name FROM information_schema.columns')
    console.log('WHERE table_name = \'profiles\' ORDER BY ordinal_position;')
    console.log('')
    
  } catch (error) {
    console.error('❌ Cleanup preparation failed:', error.message)
    process.exit(1)
  }
}

async function main() {
  console.log('🧹 Final Cleanup: Drop full_name columns')
  console.log('')
  
  const isVerified = await verifyMigration()
  
  if (!isVerified) {
    console.error('❌ Migration verification failed. Please ensure migration is complete before cleanup.')
    process.exit(1)
  }
  
  console.log('✅ Migration verification passed!')
  console.log('')
  
  await dropFullNameColumns()
}

main()