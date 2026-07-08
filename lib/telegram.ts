/**
 * Minimal Telegram Bot API wrapper for match reminders.
 *
 * Setup (one-time, manual — see docs at the bottom of this file):
 *   1. Message @BotFather on Telegram, run /newbot, follow the prompts.
 *   2. Set TELEGRAM_BOT_TOKEN to the token it gives you.
 *   3. Set NEXT_PUBLIC_TELEGRAM_BOT_USERNAME to the bot's @username
 *      (without the @) — used client-side to build the t.me deep link.
 *
 * Uses polling (getUpdates), not a webhook — fits the existing
 * setInterval-based scheduler in lib/scheduler.ts without needing a
 * public HTTPS callback URL registered with Telegram.
 */

const TELEGRAM_API = 'https://api.telegram.org'

export function isTelegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return false
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    })
    return res.ok
  } catch {
    return false
  }
}

interface TelegramUpdate {
  update_id: number
  message?: { text?: string; chat?: { id: number } }
}

export async function getTelegramUpdates(offset?: number): Promise<{ updates: TelegramUpdate[]; nextOffset?: number }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { updates: [], nextOffset: offset }
  try {
    const url = new URL(`${TELEGRAM_API}/bot${token}/getUpdates`)
    url.searchParams.set('timeout', '0')
    if (offset != null) url.searchParams.set('offset', String(offset))
    const res = await fetch(url.toString())
    const data = await res.json()
    const updates: TelegramUpdate[] = data.result || []
    const nextOffset = updates.length > 0 ? updates[updates.length - 1].update_id + 1 : offset
    return { updates, nextOffset }
  } catch {
    return { updates: [], nextOffset: offset }
  }
}
