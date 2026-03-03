/**
 * GET /api/auth/youtube
 * Starts the YouTube OAuth 2.0 flow.
 * Visit this URL in browser to authorize CricketTips.ai to manage your YouTube channel.
 */

import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/youtube'

export async function GET() {
  try {
    const url = getAuthUrl()
    return NextResponse.redirect(url)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
