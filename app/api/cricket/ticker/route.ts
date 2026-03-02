/**
 * GET /api/cricket/ticker
 * Lightweight endpoint for the nav ticker — powered by Roanuz (no quota limits)
 */

import { NextResponse } from 'next/server'
import { getFeaturedMatches2, normalizeRoanuzMatch } from '@/lib/roanuz'

export async function GET() {
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const all = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    const live = all.filter((m: any) => m.status === 'live')
    const upcoming = all.filter((m: any) => m.status === 'upcoming').slice(0, 8)
    console.log(`[Ticker] Roanuz: ${live.length} live, ${upcoming.length} upcoming`)
    return NextResponse.json({ success: true, source: 'roanuz', live, upcoming })
  } catch (error: any) {
    console.error('[Ticker] Roanuz failed:', error.message)
    return NextResponse.json({ success: false, live: [], upcoming: [] })
  }
}

export const revalidate = 60
