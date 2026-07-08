import { Resend } from 'resend'

/**
 * Minimal Resend wrapper for the weekly digest email.
 *
 * Setup (one-time, manual):
 *   1. Create an account at resend.com, verify a sending domain.
 *   2. Set RESEND_API_KEY to an API key from the dashboard.
 *   3. Optionally set RESEND_FROM_EMAIL (defaults to a crickettips.ai address).
 *
 * No-ops (returns false, never throws) until RESEND_API_KEY is set — same
 * gating pattern as lib/telegram.ts's isTelegramConfigured().
 */

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

let client: Resend | null = null
function getClient(): Resend | null {
  if (!isResendConfigured()) return null
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const resend = getClient()
  if (!resend) return false
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'CricketTips.ai <digest@crickettips.ai>',
      to,
      subject,
      html,
    })
    return !error
  } catch {
    return false
  }
}
