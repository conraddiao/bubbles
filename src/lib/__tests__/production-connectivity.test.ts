/**
 * Production Database Connectivity Tests
 * 
 * These tests run against the actual production Supabase instance
 * to diagnose RLS, connectivity, and auth issues.
 * 
 * Run with: npm test -- production-connectivity.test.ts
 */

import { supabase } from '../supabase'
import { fetchUserProfile } from '../auth-service'

// Test user ID from production
const TEST_USER_ID = '5babb625-93d5-4ec0-8c27-4d2a11e03237'

describe('Production Database Connectivity', () => {
  beforeAll(() => {
    console.log('🔍 Testing against production Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  })

  describe('Basic Connectivity', () => {
    it('should connect to Supabase', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      expect(error).toBeNull()
      console.log('✅ Basic connection successful')
    }, 10000)

    it('should have valid auth configuration', async () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
      
      // Test auth endpoint
      const { data, error } = await supabase.auth.getSession()
      expect(error).toBeNull()
      console.log('✅ Auth configuration valid')
    })
  })

  describe('RLS Policy Tests', () => {
    it('should test profiles table access without auth', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', TEST_USER_ID)
        .single()
      
      // Should fail due to RLS
      expect(error).toBeTruthy()
      console.log('✅ RLS blocking unauthenticated access:', error?.message)
    })

    it('should test contact_groups RLS policies', async () => {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('id, name')
        .limit(5)
      
      console.log('📊 Contact groups query result:', { 
        success: !error, 
        count: data?.length || 0,
        error: error?.message 
      })
    })

    it('should test group_memberships RLS policies', async () => {
      const { data, error } = await supabase
        .from('group_memberships')
        .select('id, group_id')
        .limit(5)
      
      console.log('📊 Group memberships query result:', { 
        success: !error, 
        count: data?.length || 0,
        error: error?.message 
      })
    })
  })

  describe('Profile Fetch Diagnostics', () => {
    it('should test raw profile query performance', async () => {
      const startTime = Date.now()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', TEST_USER_ID)
        .single()
      
      const duration = Date.now() - startTime
      
      console.log('⏱️ Raw profile query:', {
        duration: `${duration}ms`,
        success: !error,
        hasData: !!data,
        error: error?.message,
        errorCode: error?.code
      })
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000)
    }, 10000)

    it('should test profile query with explicit columns', async () => {
      const startTime = Date.now()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, phone_verified, two_factor_enabled, sms_notifications_enabled')
        .eq('id', TEST_USER_ID)
        .single()
      
      const duration = Date.now() - startTime
      
      console.log('⏱️ Explicit columns profile query:', {
        duration: `${duration}ms`,
        success: !error,
        hasData: !!data,
        error: error?.message
      })
    }, 10000)

    it('should test fetchUserProfile function directly', async () => {
      const startTime = Date.now()
      
      try {
        const profile = await fetchUserProfile(TEST_USER_ID)
        const duration = Date.now() - startTime
        
        console.log('✅ fetchUserProfile success:', {
          duration: `${duration}ms`,
          hasProfile: !!profile,
          email: profile?.email
        })
        
        expect(profile).toBeTruthy()
      } catch (error: any) {
        const duration = Date.now() - startTime
        
        console.log('❌ fetchUserProfile failed:', {
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack?.split('\n')[0]
        })
        
        throw error
      }
    }, 35000) // 35 second timeout to match our service timeout
  })

  describe('Auth Flow Tests', () => {
    it('should test auth state without login', async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      console.log('🔐 Current auth state:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        error: error?.message
      })
    })

    it('should test auth.uid() function availability', async () => {
      const { data, error } = await supabase.rpc('auth.uid')
      
      console.log('🆔 auth.uid() test:', {
        success: !error,
        result: data,
        error: error?.message
      })
    })
  })

  describe('Network Performance', () => {
    it('should measure connection latency', async () => {
      const tests = []
      
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now()
        
        await supabase
          .from('profiles')
          .select('count')
          .limit(1)
        
        tests.push(Date.now() - startTime)
      }
      
      const avgLatency = tests.reduce((a, b) => a + b, 0) / tests.length
      
      console.log('🌐 Network performance:', {
        tests,
        averageLatency: `${avgLatency.toFixed(0)}ms`,
        maxLatency: `${Math.max(...tests)}ms`
      })
      
      // Should have reasonable latency
      expect(avgLatency).toBeLessThan(2000)
    })
  })

  describe('Database Schema Validation', () => {
    it('should verify profiles table structure', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
      
      if (data && data[0]) {
        const columns = Object.keys(data[0])
        console.log('📋 Profiles table columns:', columns)
        
        // Verify expected columns exist
        expect(columns).toContain('id')
        expect(columns).toContain('email')
        expect(columns).toContain('first_name')
        expect(columns).toContain('last_name')
      }
    })

    it('should verify RLS is enabled on tables', async () => {
      const { data, error } = await supabase
        .rpc('check_rls_status')
        .single()
      
      console.log('🔒 RLS status check:', {
        success: !error,
        data,
        error: error?.message
      })
    })
  })
})