import { Resend } from 'resend'

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  return new Resend(apiKey)
}

export interface SendAlertEmailOptions {
  subject: string
  html: string
}

export async function sendAlertEmail({ subject, html }: SendAlertEmailOptions): Promise<void> {
  const from = process.env.ALERT_EMAIL_FROM
  const to = process.env.ALERT_EMAIL_TO
  if (!from || !to) {
    console.error('sendAlertEmail: ALERT_EMAIL_FROM or ALERT_EMAIL_TO not configured')
    return
  }
  try {
    const resend = getResendClient()
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) {
      console.error('Resend email send failed:', error)
    }
  } catch (err) {
    console.error('sendAlertEmail threw:', err)
  }
}
