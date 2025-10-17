#!/usr/bin/env node

/**
 * Production Database Diagnostic Script
 * 
 * Quick diagnostic tool to test production database connectivity,
 * RLS policies, and profile fetch issues without Jest overhead.
 */

// Load environment variables from .env.local if it exists
try {
  const fs = require('fs')
  const path = require('path')
  const envPath = path.join(process.cwd(), '.env.local')
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    })
  }
} catch (err) {
  console.log('Note: Could not load .env.local file')
}

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const testUserId = '5babb625-93d5-4ec0-8c27-4d2a11e03237'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runDiagnostics() {
  console.log('🔍 Production Database Diagnostics')
  console.log('=' .repeat(50))
  console.log(`URL: ${supabaseUrl}`)
  console.log(`Test User: ${testUserId}`)
  console.log('')

  // Test 1: Basic connectivity
  console.log('1️⃣ Testing basic connectivity...')
  try {
    const start = Date.now()
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    const duration = Date.now() - start
    
    if (error) {
      console.log(`❌ Connection failed (${duration}ms):`, error.message)
    } else {
      console.log(`✅ Connection successful (${duration}ms)`)
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message)
  }

  // Test 2: Auth session
  console.log('\n2️⃣ Testing auth session...')
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log(`Session exists: ${!!session}`)
    console.log(`User exists: ${!!session?.user}`)
    console.log(`User ID: ${session?.user?.id || 'none'}`)
    if (error) console.log('Auth error:', error.message)
  } catch (err) {
    console.log('❌ Auth session error:', err.message)
  }

  // Test 3: Profile query without auth (should fail due to RLS)
  console.log('\n3️⃣ Testing RLS protection (should fail)...')
  try {
    const start = Date.now()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single()
    const duration = Date.now() - start
    
    if (error) {
      console.log(`✅ RLS working - access denied (${duration}ms):`, error.message)
    } else {
      console.log(`⚠️ RLS might be disabled - got data (${duration}ms):`, !!data)
    }
  } catch (err) {
    console.log('❌ RLS test error:', err.message)
  }

  // Test 4: Profile query performance
  console.log('\n4️⃣ Testing profile query performance...')
  try {
    const start = Date.now()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, phone')
      .eq('id', testUserId)
      .single()
    const duration = Date.now() - start
    
    console.log(`Query duration: ${duration}ms`)
    console.log(`Has data: ${!!data}`)
    console.log(`Error: ${error?.message || 'none'}`)
    console.log(`Error code: ${error?.code || 'none'}`)
    
    if (data) {
      console.log(`Profile email: ${data.email}`)
    }
  } catch (err) {
    console.log('❌ Profile query error:', err.message)
  }

  // Test 5: Network latency test
  console.log('\n5️⃣ Testing network latency (3 requests)...')
  const latencies = []
  
  for (let i = 0; i < 3; i++) {
    try {
      const start = Date.now()
      await supabase.from('profiles').select('count').limit(1)
      latencies.push(Date.now() - start)
    } catch (err) {
      console.log(`Request ${i + 1} failed:`, err.message)
    }
  }
  
  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length
    console.log(`Latencies: ${latencies.join('ms, ')}ms`)
    console.log(`Average: ${avg.toFixed(0)}ms`)
  }

  // Test 6: Table access tests
  console.log('\n6️⃣ Testing table access...')
  
  const tables = ['profiles', 'contact_groups', 'group_memberships']
  
  for (const table of tables) {
    try {
      const start = Date.now()
      const { data, error } = await supabase.from(table).select('*').limit(1)
      const duration = Date.now() - start
      
      console.log(`${table}: ${error ? '❌' : '✅'} (${duration}ms) ${error?.message || 'OK'}`)
    } catch (err) {
      console.log(`${table}: ❌ ${err.message}`)
    }
  }

  console.log('\n' + '=' .repeat(50))
  console.log('🏁 Diagnostics complete!')
}

// Run diagnostics
runDiagnostics().catch(console.error)