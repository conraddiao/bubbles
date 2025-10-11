#!/usr/bin/env node

/**
 * Simple Database Migration Script
 * 
 * This script performs the basic migration steps using Supabase client operations
 * instead of raw SQL execution.
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

async function checkAndMigrateData() {
  try {
    console.log('🚀 Starting simple data migration...')
    
    // Step 1: Check if we have any group memberships with full_name but missing first_name/last_name
    console.log('📊 Checking group_memberships table...')
    
    const { data: memberships, error: memberError } = await supabase
      .from('group_memberships')
      .select('id, full_name, first_name, last_name')
      .or('first_name.is.null,first_name.eq.')
    
    if (memberError) {
      console.error('❌ Error checking group_memberships:', memberError)
      throw memberError
    }
    
    console.log(`   Found ${memberships?.length || 0} memberships that need migration`)
    
    // Step 2: Migrate group_memberships data
    if (memberships && memberships.length > 0) {
      console.log('🔄 Migrating group_memberships data...')
      
      for (const membership of memberships) {
        if (membership.full_name && (!membership.first_name || membership.first_name === '')) {
          const nameParts = membership.full_name.trim().split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''
          
          const { error: updateError } = await supabase
            .from('group_memberships')
            .update({
              first_name: firstName,
              last_name: lastName
            })
            .eq('id', membership.id)
          
          if (updateError) {
            console.error(`❌ Error updating membership ${membership.id}:`, updateError)
          } else {
            console.log(`   ✅ Updated: "${membership.full_name}" → "${firstName}" + "${lastName}"`)
          }
        }
      }
    }
    
    // Step 3: Check profiles table
    console.log('📊 Checking profiles table...')
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name')
      .or('first_name.is.null,first_name.eq.')
    
    if (profileError) {
      console.error('❌ Error checking profiles:', profileError)
      throw profileError
    }
    
    console.log(`   Found ${profiles?.length || 0} profiles that need migration`)
    
    // Step 4: Migrate profiles data
    if (profiles && profiles.length > 0) {
      console.log('🔄 Migrating profiles data...')
      
      for (const profile of profiles) {
        if (profile.full_name && (!profile.first_name || profile.first_name === '')) {
          const nameParts = profile.full_name.trim().split(' ')
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ') || ''
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              first_name: firstName,
              last_name: lastName
            })
            .eq('id', profile.id)
          
          if (updateError) {
            console.error(`❌ Error updating profile ${profile.id}:`, updateError)
          } else {
            console.log(`   ✅ Updated: "${profile.full_name}" → "${firstName}" + "${lastName}"`)
          }
        }
      }
    }
    
    console.log('')
    console.log('✅ Data migration completed!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`   • Migrated ${memberships?.length || 0} group memberships`)
    console.log(`   • Migrated ${profiles?.length || 0} profiles`)
    console.log('')
    console.log('🔄 Next steps:')
    console.log('   1. Test your application to ensure names display correctly')
    console.log('   2. Check vCard exports work properly')
    console.log('   3. If everything works, you can run the full SQL migration for database functions')
    console.log('')
    console.log('⚠️  Note: This script only migrates data. You still need to:')
    console.log('   • Add proper column constraints (NOT NULL, defaults)')
    console.log('   • Update database functions (get_group_members, etc.)')
    console.log('   • Run the full SQL migration for complete setup')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('')
    console.error('🔧 Troubleshooting:')
    console.error('   1. Ensure your Supabase credentials are correct')
    console.error('   2. Check that you have sufficient permissions')
    console.error('   3. Verify the tables exist and have the expected columns')
    process.exit(1)
  }
}

// Run the migration
checkAndMigrateData()