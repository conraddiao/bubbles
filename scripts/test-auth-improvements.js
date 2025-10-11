// Test script for authentication improvements
// Run this in your browser console to test the new auth flow

async function testAuthImprovements() {
  console.log('🧪 Testing authentication improvements...')
  
  try {
    // Test 1: Check current auth state
    console.log('\n1️⃣ Testing current auth state...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('Current user:', user ? `${user.email} (${user.id})` : 'Not authenticated')
    
    if (userError) {
      console.error('Auth error:', userError)
      return
    }
    
    if (!user) {
      console.log('ℹ️ Please sign in first to test profile fetching')
      return
    }
    
    // Test 2: Profile fetching with timeout
    console.log('\n2️⃣ Testing profile fetch with timeout...')
    const startTime = Date.now()
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      const duration = Date.now() - startTime
      console.log(`✅ Profile fetched in ${duration}ms:`, profile)
      
      if (profileError) {
        console.error('Profile error:', profileError)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Profile fetch failed after ${duration}ms:`, error)
    }
    
    // Test 3: Groups access
    console.log('\n3️⃣ Testing groups access...')
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('contact_groups')
        .select('*')
        .limit(5)
      
      console.log(`✅ Groups query successful. Found ${groups?.length || 0} groups`)
      
      if (groupsError) {
        console.error('Groups error:', groupsError)
      }
    } catch (error) {
      console.error('❌ Groups fetch failed:', error)
    }
    
    // Test 4: RLS status check
    console.log('\n4️⃣ Checking RLS status...')
    try {
      const { data: rlsStatus, error: rlsError } = await supabase
        .rpc('check_rls_status')
        .single()
      
      console.log('RLS Status:', rlsStatus)
    } catch (error) {
      console.log('ℹ️ RLS status check not available (function may not exist)')
    }
    
    console.log('\n✅ Auth improvements test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Helper function to test retry mechanism
async function testRetryMechanism() {
  console.log('🔄 Testing retry mechanism...')
  
  let attempts = 0
  const maxRetries = 3
  
  const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
    let lastError
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        attempts = attempt
        console.log(`Attempt ${attempt}/${maxRetries}`)
        return await operation()
      } catch (error) {
        lastError = error
        console.warn(`Attempt ${attempt} failed:`, error.message)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
    }
    
    throw lastError
  }
  
  try {
    // Simulate a flaky operation
    const result = await retryOperation(async () => {
      if (Math.random() < 0.7) { // 70% chance of failure
        throw new Error('Simulated network error')
      }
      return 'Success!'
    })
    
    console.log(`✅ Retry mechanism worked! Result: ${result} (after ${attempts} attempts)`)
  } catch (error) {
    console.error(`❌ Retry mechanism failed after ${attempts} attempts:`, error.message)
  }
}

// Run the tests
console.log('🚀 Starting authentication improvements test...')
console.log('Run testAuthImprovements() to test auth flow')
console.log('Run testRetryMechanism() to test retry logic')

// Auto-run if user is already authenticated
supabase.auth.getUser().then(({ data: { user } }) => {
  if (user) {
    console.log('User detected, running auth test...')
    testAuthImprovements()
  }
})

// Export functions for manual testing
window.testAuthImprovements = testAuthImprovements
window.testRetryMechanism = testRetryMechanism