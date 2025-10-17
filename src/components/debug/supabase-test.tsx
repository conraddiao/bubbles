'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export function SupabaseTest() {
  const [status, setStatus] = useState('Testing...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }

  useEffect(() => {
    const testConnection = async () => {
      try {
        addLog('Starting Supabase connection test')
        
        // Test 1: Basic connection
        addLog('Test 1: Basic connection test')
        const startTime = Date.now()
        
        const testPromise = supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true })
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000)
        })
        
        const result = await Promise.race([testPromise, timeoutPromise])
        const duration = Date.now() - startTime
        
        addLog(`Test 1 completed in ${duration}ms: ${JSON.stringify(result)}`)
        
        // Test 2: Auth session
        addLog('Test 2: Getting auth session')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          addLog(`Session error: ${sessionError.message}`)
        } else {
          addLog(`Session: ${session ? 'Found' : 'None'} - User ID: ${session?.user?.id || 'N/A'}`)
        }
        
        // Test 3: If we have a session, try to fetch profile
        if (session?.user?.id) {
          addLog('Test 3: Fetching profile')
          const profileStart = Date.now()
          
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single<Profile>()
          
          const profileTimeoutPromise = new Promise<'timeout'>(resolve => {
            setTimeout(() => resolve('timeout'), 10000)
          })
          
          try {
            const profileResult = await Promise.race([profilePromise, profileTimeoutPromise])
            const profileDuration = Date.now() - profileStart
            if (profileResult === 'timeout') {
              addLog(`Profile fetch timed out after ${profileDuration}ms`)
            } else {
              addLog(`Profile fetch completed in ${profileDuration}ms: ${profileResult.error ? 'Error' : 'Success'}`)
              
              if (profileResult.error) {
                addLog(`Profile error: ${profileResult.error.code} - ${profileResult.error.message}`)
              }
            }
          } catch (error: any) {
            addLog(`Profile fetch failed: ${error.message}`)
          }
        }
        
        setStatus('Tests completed')
        
      } catch (error: any) {
        addLog(`Connection test failed: ${error.message}`)
        setStatus('Tests failed')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Supabase Connection Test</h3>
      <p className="mb-4">Status: {status}</p>
      
      <div className="space-y-1 text-sm font-mono bg-gray-100 p-2 rounded max-h-96 overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  )
}
