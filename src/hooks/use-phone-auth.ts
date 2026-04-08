'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface UsePhoneAuthReturn {
  sendOtp: (phone: string) => Promise<{ error?: string }>
  verifyOtp: (phone: string, token: string) => Promise<{ error?: string }>
  isLoading: boolean
  resendCooldown: number
}

export function usePhoneAuth(): UsePhoneAuthReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startCooldown = useCallback(() => {
    setResendCooldown(30)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const sendOtp = useCallback(
    async (phone: string): Promise<{ error?: string }> => {
      setIsLoading(true)
      try {
        const { error } = await supabase.auth.signInWithOtp({ phone })
        if (error) {
          toast.error(error.message)
          return { error: error.message }
        }
        startCooldown()
        toast.success('Verification code sent')
        return {}
      } catch {
        const msg = 'Failed to send verification code. Please try again.'
        toast.error(msg)
        return { error: msg }
      } finally {
        setIsLoading(false)
      }
    },
    [startCooldown]
  )

  const verifyOtp = useCallback(
    async (phone: string, token: string): Promise<{ error?: string }> => {
      setIsLoading(true)
      try {
        const { error } = await supabase.auth.verifyOtp({
          phone,
          token,
          type: 'sms',
        })
        if (error) {
          toast.error(error.message)
          return { error: error.message }
        }
        return {}
      } catch {
        const msg = 'Verification failed. Please try again.'
        toast.error(msg)
        return { error: msg }
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { sendOtp, verifyOtp, isLoading, resendCooldown }
}
