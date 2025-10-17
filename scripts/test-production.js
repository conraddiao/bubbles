#!/usr/bin/env node

/**
 * Production Database Test Runner
 * 
 * This script runs connectivity and RLS tests against the production database
 * to help diagnose authentication and profile fetch issues.
 */

const { execSync } = require('child_process')
const path = require('path')

console.log('🚀 Starting Production Database Tests...\n')

// Ensure we're using production environment
process.env.NODE_ENV = 'test'

try {
  // Run the production connectivity tests
  const testCommand = 'npx vitest run src/lib/__tests__/production-connectivity.test.ts'
  
  console.log('Running command:', testCommand)
  console.log('=' .repeat(60))
  
  execSync(testCommand, { 
    stdio: 'inherit',
    cwd: process.cwd()
  })
  
  console.log('\n' + '=' .repeat(60))
  console.log('✅ Production tests completed successfully!')
  
} catch (error) {
  console.log('\n' + '=' .repeat(60))
  console.log('❌ Production tests failed with errors')
  console.log('Error:', error.message)
  process.exit(1)
}