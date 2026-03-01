/**
 * GET /api/cricket/ticker
 *
 * Lightweight endpoint for the nav ticker — returns live + upcoming matches.
 * Uses a 15-minute server cache so we stay within CricAPI free plan (100 calls/day).
 * 15-min cache = max 96 calls/day.
 */

import { NextResponse } from 'next/server'

const API_KEY = process.env.CRICKET_API_KEY || ''
const BASE_URL = process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1'

function normalizeMatch(m: any) {
  if (!m || !m.id) return null
  const isLive = m.matchStarted === true && m.matchEnded !== true
  const isUpcoming = m.matchStarted !== true && m.matchEnded !== true

  const scoreA = m.score?.[0]
    ? `${m.score[0].r}/${m.score[0].w} (${m.score[0].o} ov)`
    : null
  const scoreB = m.score?.[1]
    ? `${m.score[1].r}/${m.score[1].w} (${m.score[1].o} ov)`
    : null

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
  try {
    const url = new URL(`${BASE_URL}/currentMatches`)
    url.searchParams.set('apikey', API_KEY)
    url.searchParams.set('offset', '0')

    // 15-minute server cache — max 96 CricAPI calls/day (free plan allows 100)
    const res = await fetch(url.toString(), { next: { revalidate: 900 } })

    if (!res.ok) throw new Error(`CricAPI returned ${res.status}`)

    const json = await res.json()
    if (json.status !== 'success') {
      throw new Error(json.reason || 'CricAPI error')
    }

    const all = (json.data || []).map(normalizeMatch).filter(Boolean)
    const live = all.filter((m: any) => m.status === 'live')
    const upcoming = all.filter((m: any) => m.status === 'upcoming').slice(0, 8)

    return NextResponse.json({ success: true, live, upcoming })
  } catch (error: any) {
    console.warn('[Ticker] CricAPI failed:', error.message)
    return NextResponse.json({ success: false, live: [], upcoming: [] })
  }
}

// 15-minute route-level cache
export const revalidate = 900
