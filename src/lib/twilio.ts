// Twilio SMS service integration
// This will be implemented with Supabase Edge Functions for security

export interface SMSMessage {
  to: string
  body: string
  type: 'verification' | '2fa' | 'notification'
}

export interface SMSResponse {
  success: boolean
  messageId?: string
  error?: string
}

// Client-side functions that call Supabase Edge Functions
export async function sendVerificationSMS(phoneNumber: string): Promise<SMSResponse> {
  try {
    // TODO: Call Supabase Edge Function for phone verification
    const response = await fetch('/api/sms/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phoneNumber }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error sending verification SMS:', error)
    return { success: false, error: 'Failed to send SMS' }
  }
}

export async function verify2FACode(phoneNumber: string, code: string): Promise<SMSResponse> {
  try {
    // TODO: Call Supabase Edge Function for 2FA verification
    const response = await fetch('/api/sms/verify-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phoneNumber, code }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error verifying 2FA code:', error)
    return { success: false, error: 'Failed to verify code' }
  }
}

export async function send2FACode(phoneNumber: string): Promise<SMSResponse> {
  try {
    // TODO: Call Supabase Edge Function for 2FA code
    const response = await fetch('/api/sms/send-2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phoneNumber }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error sending 2FA SMS:', error)
    return { success: false, error: 'Failed to send SMS' }
  }
}

export async function sendGroupNotificationSMS(
  phoneNumbers: string[], 
  message: string,
  groupName: string
): Promise<SMSResponse> {
  try {
    // TODO: Call Supabase Edge Function for group notifications
    const response = await fetch('/api/sms/send-group-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        phones: phoneNumbers, 
        message, 
        groupName 
      }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error sending group notification SMS:', error)
    return { success: false, error: 'Failed to send SMS' }
  }
}

// Utility functions for phone number formatting
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Add country code if missing (assume US)
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  // Add + if missing
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  
  return phone
}

export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone)
  // Basic validation for international format
  return /^\+\d{10,15}$/.test(formatted)
}