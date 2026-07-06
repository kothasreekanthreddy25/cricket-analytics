const BASE_URL = 'https://cricket.sportmonks.com/api/v2.0'
const API_TOKEN = process.env.SPORTMONKS_API_TOKEN!

async function sportmonksGet(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  url.searchParams.set('api_token', API_TOKEN)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`SportMonks ${res.status}: ${body.slice(0, 200)}`)
    }
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

// --- Normalized match type (same shape as RoanuzMatch) ---

export interface SportMonksMatch {
  key: string
  name: string
  shortName: string
  teamA: string
  teamACode: string
  teamB: string
  teamBCode: string
  matchType: string
  status: 'live' | 'upcoming' | 'completed'
  statusNote: string
  scoreA: string | null
  scoreB: string | null
  venue: string
  date: string
  dateTimeGMT: string
  tournament: string
  tournamentKey: string
  // e.g. "3rd T20I", "1st ODI", "Final" — SportMonks' round field, null for
  // leagues that don't expose it (some domestic T20s)
  round: string | null
}

function formatScore(innings: any): string | null {
  if (!innings) return null
  const runs = innings.score ?? innings.runs ?? ''
  const wickets = innings.wickets ?? ''
  const overs = innings.overs ?? ''
  if (!runs && runs !== 0) return null
  return `${runs}/${wickets} (${overs})`
}

export function normalizeSportMonksMatch(m: any): SportMonksMatch | null {
  if (!m || !m.id) return null

  const smStatus = m.status || ''
  const status: 'live' | 'upcoming' | 'completed' =
    smStatus === 'Finished' || smStatus === 'Finished' || m.winner_team_id || m.draw_noresult ? 'completed'
    : m.live === true && smStatus !== 'NS' ? 'live'
    : 'upcoming'

  // Teams — included via ?include=localteam,visitorteam
  const teamA = m.localteam?.data || m.localteam || {}
  const teamB = m.visitorteam?.data || m.visitorteam || {}

  // Scores — runs is an array directly (not nested under .data)
  let scoreA: string | null = null
  let scoreB: string | null = null
  const runsArray: any[] = Array.isArray(m.runs) ? m.runs : (m.runs?.data || [])
  if (runsArray.length) {
    const localId = teamA.id || m.localteam_id
    const visitorId = teamB.id || m.visitorteam_id
    const aRuns = runsArray.filter((r: any) => r.team_id === localId)
    const bRuns = runsArray.filter((r: any) => r.team_id === visitorId)
    scoreA = aRuns.map(formatScore).filter(Boolean).join(' & ') || null
    scoreB = bRuns.map(formatScore).filter(Boolean).join(' & ') || null
  }

  const venue = m.venue?.data?.name || m.venue?.name || ''
  const league = m.league?.data || m.league || {}
  const season = m.season?.data || m.season || {}
  const startAt = m.starting_at || m.start_date || ''

  return {
    key: String(m.id),
    name: `${teamA.name || 'TBD'} vs ${teamB.name || 'TBD'}`,
    shortName: `${teamA.code || ''} vs ${teamB.code || ''}`,
    teamA: teamA.name || 'TBD',
    teamACode: teamA.code || '',
    teamB: teamB.name || 'TBD',
    teamBCode: teamB.code || '',
    matchType: m.type?.toUpperCase() || 'T20',
    status,
    statusNote: m.note || m.status || '',
    scoreA,
    scoreB,
    venue,
    date: startAt ? startAt.split('T')[0] : '',
    dateTimeGMT: startAt || '',
    tournament: league.name || season.name || '',
    tournamentKey: String(league.id || season.id || ''),
    round: m.round || null,
  }
}

// --- Match Endpoints ---

const MATCH_INCLUDES = 'localteam,visitorteam,runs,league,season,venue'

/** Live matches via /livescores endpoint */
export async function getLiveMatches() {
  return sportmonksGet('livescores', { include: MATCH_INCLUDES })
}

/** Upcoming fixtures (next 7 days) using filter[starts_between] */
export async function getUpcomingMatches() {
  const today = new Date().toISOString().split('T')[0]
  const next7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return sportmonksGet('fixtures', {
    'filter[starts_between]': `${today},${next7}`,
    include: MATCH_INCLUDES,
  })
}

/** Featured matches — live first, then upcoming */
export async function getFeaturedMatches() {
  const [liveRes, upcomingRes] = await Promise.allSettled([getLiveMatches(), getUpcomingMatches()])
  const live = liveRes.status === 'fulfilled' ? (liveRes.value?.data || []) : []
  const upcoming = upcomingRes.status === 'fulfilled' ? (upcomingRes.value?.data || []) : []
  // Deduplicate by id
  const seen = new Set(live.map((m: any) => m.id))
  const combined = [...live, ...upcoming.filter((m: any) => !seen.has(m.id))]
  return { data: combined }
}

/** Single match details */
export async function getMatchDetails(matchId: string) {
  return sportmonksGet(`fixtures/${matchId}`, {
    include: `${MATCH_INCLUDES},scoreboards,manofmatch,tosswon`,
  })
}

/** Ball-by-ball commentary */
export async function getMatchBallByBall(matchId: string) {
  return sportmonksGet(`fixtures/${matchId}`, { include: 'balls' })
}

/** Match odds */
export async function getMatchOdds(matchId: string) {
  return sportmonksGet(`odds/fixture/${matchId}`)
}

// --- Tournament / League Endpoints ---

export async function getLeagues() {
  return sportmonksGet('leagues', { include: 'season' })
}

export async function getLeague(leagueId: string) {
  return sportmonksGet(`leagues/${leagueId}`, { include: 'season,fixtures' })
}

export async function getLeagueFixtures(seasonId: string) {
  return sportmonksGet('fixtures', { 'filter[season_id]': seasonId, include: MATCH_INCLUDES })
}

// --- Stats Endpoints ---

export async function getPlayerStats(playerId: string) {
  return sportmonksGet(`players/${playerId}`, { include: 'career,teams' })
}

export async function getSeasonStandings(seasonId: string) {
  return sportmonksGet(`standings/season/${seasonId}`)
}

/** Search leagues by name */
export async function searchLeagues(query: string) {
  return sportmonksGet('leagues', { include: 'season', 'filter[name]': query })
}

/** Get all seasons for a league */
export async function getLeagueSeasons(leagueId: string) {
  return sportmonksGet(`leagues/${leagueId}`, { include: 'seasons' })
}

/** Get fixtures for a specific league (all seasons) via fixtures endpoint */
export async function getHistoricalFixtures(leagueId: string, seasonId?: string) {
  const params: Record<string, string> = {
    include: `${MATCH_INCLUDES},scoreboards`,
    'filter[league_id]': leagueId,
  }
  if (seasonId) params['filter[season_id]'] = seasonId
  return sportmonksGet('fixtures', params)
}

// --- Live Scorecard ---

export async function getLiveScorecard(matchId: string) {
  return sportmonksGet(`fixtures/${matchId}`, {
    include: `${MATCH_INCLUDES},scoreboards,balls,batting,bowling`,
  })
}

// --- Enhanced Stats Endpoints ---

export async function getMatchStats(matchId: string) {
  return sportmonksGet(`fixtures/${matchId}`, {
    include: 'balls,localteam,visitorteam,runs,scoreboards',
  })
}

export async function getPlayerCareer(playerId: string) {
  return sportmonksGet(`players/${playerId}`, { include: 'career' })
}

export async function getLeagueRecentFixtures(leagueId: string) {
  return sportmonksGet('fixtures', {
    'filter[league_id]': leagueId,
    include: 'localteam,visitorteam,runs',
    sort: '-starting_at',
    per_page: '30',
  })
}
