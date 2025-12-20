import { supabase } from './supabase'

export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('Database connection error:', {
        code: connectionError.code,
        message: connectionError.message,
        details: connectionError.details,
        hint: connectionError.hint
      })
      return false
    }
    
    console.log('Database connection successful')
    
    // Test if profiles table exists and has correct structure
    const { data: tableTest, error: tableError } = await supabase
      .from('profiles')
      .select('id,email,first_name,last_name,phone,phone_verified,two_factor_enabled,sms_notifications_enabled,created_at,updated_at')
      .limit(1)
    
    if (tableError) {
      console.error('Profiles table structure error:', {
        code: tableError.code,
        message: tableError.message,
        details: tableError.details,
        hint: tableError.hint
      })
      return false
    }
    
    console.log('Profiles table structure is correct')
    return true
    
  } catch (error) {
    console.error('Unexpected database test error:', error)
    return false
  }
}
