/**
 * GET /api/cricket/ticker
 *
 * Lightweight endpoint for the nav ticker.
 * Primary: Roanuz featured-matches-2 (no quota limits)
 * Fallback: CricAPI with 15-min cache (96 calls/day, fits free plan)
 */

import { NextResponse } from 'next/server'
import { getFeaturedMatches2, normalizeRoanuzMatch } from '@/lib/roanuz'

const CRICAPI_KEY = process.env.CRICKET_API_KEY || ''
const CRICAPI_URL = process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1'

function normalizeCricapiMatch(m: any) {
  if (!m || !m.id) return null
  const isLive = m.matchStarted === true && m.matchEnded !== true
  const isUpcoming = m.matchStarted !== true && m.matchEnded !== true
  const scoreA = m.score?.[0] ? `${m.score[0].r}/${m.score[0].w} (${m.score[0].o} ov)` : null
  const scoreB = m.score?.[1] ? `${m.score[1].r}/${m.score[1].w} (${m.score[1].o} ov)` : null
  return {
    key: m.id,
    id: m.id,
    name: m.name || '',
    teamA: m.teams?.[0] || 'TBD',
    teamB: m.teams?.[1] || 'TBD',
    matchType: m.matchType?.toUpperCase() || 'T20',
    status: isLive ? 'live' : isUpcoming ? 'upcoming' : 'completed',
    statusNote: m.status || '',
    scoreA,
    scoreB,
    date: m.date || '',
    dateTimeGMT: m.dateTimeGMT || '',
  }
}

export async function GET() {
  // 1. Try Roanuz (primary — no quota)
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const all = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    const live = all.filter((m: any) => m.status === 'live')
    const upcoming = all.filter((m: any) => m.status === 'upcoming').slice(0, 8)
    console.log(`[Ticker] Roanuz: ${live.length} live, ${upcoming.length} upcoming`)
    return NextResponse.json({ success: true, source: 'roanuz', live, upcoming })
  } catch (err: any) {
    console.warn('[Ticker] Roanuz failed:', err.message)
  }

  // 2. Fallback: CricAPI with 15-min cache
  try {
    const url = new URL(`${CRICAPI_URL}/currentMatches`)
    url.searchParams.set('apikey', CRICAPI_KEY)
    url.searchParams.set('offset', '0')
    const res = await fetch(url.toString(), { next: { revalidate: 900 } })
    if (!res.ok) throw new Error(`CricAPI ${res.status}`)
    const json = await res.json()
    if (json.status !== 'success') throw new Error(json.reason || 'CricAPI error')
    const all = (json.data || []).map(normalizeCricapiMatch).filter(Boolean)
    const live = all.filter((m: any) => m.status === 'live')
    const upcoming = all.filter((m: any) => m.status === 'upcoming').slice(0, 8)
    return NextResponse.json({ success: true, source: 'cricapi', live, upcoming })
  } catch (err: any) {
    console.warn('[Ticker] CricAPI also failed:', err.message)
    return NextResponse.json({ success: false, live: [], upcoming: [] })
  }
}

export const revalidate = 60
