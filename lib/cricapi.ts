/**
 * CricAPI (cricapi.com) integration — used as fallback when Roanuz endpoints
 * are unavailable (plan restriction / 403 / 404).
 */

const API_KEY = process.env.CRICKET_API_KEY || ''
const BASE_URL = process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1'

async function cricapiGet(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  url.searchParams.set('apikey', API_KEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`CricAPI ${endpoint} returned ${res.status}`)
  const json = await res.json()
  if (json.status !== 'success') throw new Error(`CricAPI error: ${json.reason || json.status}`)
  return json
}

// ─── Match Endpoints ────────────────────────────────────────────────────────

/** Current matches (live + upcoming) */
export async function cricapiCurrentMatches() {
  const json = await cricapiGet('currentMatches', { offset: '0' })
  return normalizeCricapiMatches(json.data || [])
}

/** Single match info by ID */
export async function cricapiMatchInfo(matchId: string) {
  const json = await cricapiGet('match_info', { id: matchId })
  return normalizeMatch(json.data)
}

/** Match scorecard */
export async function cricapiScorecard(matchId: string) {
  const json = await cricapiGet('match_scorecard', { id: matchId })
  return json.data
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

/** Normalize a CricAPI match object into a common shape used across the app */
export function normalizeMatch(m: any) {
  if (!m) return null
  const isLive = m.matchStarted && !m.matchEnded
  const isUpcoming = !m.matchStarted
  const scoreA = m.score?.[0]
    ? `${m.score[0].r}/${m.score[0].w} (${m.score[0].o} ov)`
    : null
  const scoreB = m.score?.[1]
    ? `${m.score[1].r}/${m.score[1].w} (${m.score[1].o} ov)`
    : null

  return {
    key: m.id,
    id: m.id,
    name: m.name,
    teamA: m.teams?.[0] || 'TBD',
    teamB: m.teams?.[1] || 'TBD',
    teamAImg: m.teamInfo?.[0]?.img || null,
    teamBImg: m.teamInfo?.[1]?.img || null,
    matchType: m.matchType?.toUpperCase() || 'T20',
    status: isLive ? 'live' : isUpcoming ? 'upcoming' : 'completed',
    statusNote: m.status || '',
    venue: m.venue || '',
    date: m.date || '',
    dateTimeGMT: m.dateTimeGMT || '',
    scoreA,
    scoreB,
    // Keep raw data for detailed pages
    raw: m,
  }
}

export function normalizeCricapiMatches(matches: any[]) {
  return matches.map(normalizeMatch).filter(Boolean)
}