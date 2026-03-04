const PROJECT_KEY = process.env.ROANUZ_PROJECT_KEY!
const API_KEY = process.env.ROANUZ_API_KEY!
const BASE_URL = process.env.ROANUZ_BASE_URL || 'https://api.sports.roanuz.com/v5'

let cachedToken: string | null = null
let tokenExpiry: number = 0

async function getToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return cachedToken
  }

  const url = `${BASE_URL}/core/${PROJECT_KEY}/auth/`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: API_KEY }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Roanuz auth failed: ${res.status} - ${errBody.slice(0, 200)}`)
  }
  const data = await res.json()

  // Response format: { data: { token: "...", expires: 1234567890.123 } }
  cachedToken = data.data?.token || data.token

  // Expires is a Unix timestamp (seconds)
  const expires = data.data?.expires || data.expires
  tokenExpiry = expires ? expires * 1000 : Date.now() + 23 * 60 * 60 * 1000

  if (!cachedToken) {
    throw new Error('Failed to get Roanuz auth token — no token in response')
  }

  return cachedToken
}

export async function roanuzGet(endpoint: string) {
  const token = await getToken()
  const url = `${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      headers: { 'rs-token': token },
      signal: controller.signal,
      cache: 'no-store',
    })
    const data = await res.json()
    // Treat 403 (plan restriction) as an error so fallback is triggered
    if (data?.error?.http_status_code === 403) {
      throw new Error(`Roanuz 403: ${data.error.msg}`)
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

// --- Normalizer ---

export interface RoanuzMatch {
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
}

export function normalizeRoanuzMatch(m: any): RoanuzMatch | null {
  if (!m || !m.key) return null

  const status: 'live' | 'upcoming' | 'completed' =
    m.status === 'live' || m.status === 'started' ? 'live'
    : m.status === 'completed' ? 'completed'
    : 'upcoming'

  const teamA = m.teams?.a
  const teamB = m.teams?.b

  // Extract innings scores from play.innings
  let scoreA: string | null = null
  let scoreB: string | null = null
  if (m.play?.innings) {
    const aScores = Object.entries(m.play.innings)
      .filter(([k]) => k.startsWith('a_'))
      .map(([, v]: any) => v.score_str)
      .filter(Boolean)
    const bScores = Object.entries(m.play.innings)
      .filter(([k]) => k.startsWith('b_'))
      .map(([, v]: any) => v.score_str)
      .filter(Boolean)
    scoreA = aScores.join(' & ') || null
    scoreB = bScores.join(' & ') || null
  }

  return {
    key: m.key,
    name: m.name || '',
    shortName: m.short_name || '',
    teamA: teamA?.name || 'TBD',
    teamACode: teamA?.code || '',
    teamB: teamB?.name || 'TBD',
    teamBCode: teamB?.code || '',
    matchType: m.format?.toUpperCase() || 'T20',
    status,
    statusNote: m.play?.result?.msg || '',
    scoreA,
    scoreB,
    venue: m.venue?.name || '',
    date: m.start_at ? new Date(m.start_at * 1000).toISOString().split('T')[0] : '',
    dateTimeGMT: m.start_at ? new Date(m.start_at * 1000).toISOString() : '',
    tournament: m.tournament?.name || '',
    tournamentKey: m.tournament?.key || '',
  }
}

// --- Match Endpoints ---

/** featured-matches-2 — works on current plan (use instead of featured-matches/) */
export async function getFeaturedMatches2() {
  return roanuzGet('featured-matches-2/')
}

/** @deprecated use getFeaturedMatches2() */
export async function getFeaturedMatches() {
  return roanuzGet('featured-matches-2/')
}

export async function getMatchDetails(matchKey: string) {
  return roanuzGet(`match/${matchKey}/`)
}

export async function getMatchBallByBall(matchKey: string) {
  return roanuzGet(`match/${matchKey}/ball-by-ball/`)
}

export async function getMatchOvers(matchKey: string) {
  return roanuzGet(`match/${matchKey}/overs-summary/`)
}

// --- Tournament Endpoints ---

export async function getFeaturedTournaments() {
  return roanuzGet('featured-tournaments/')
}

export async function getTournament(tournamentKey: string) {
  return roanuzGet(`tournament/${tournamentKey}/`)
}

export async function getTournamentFeaturedMatches(tournamentKey: string) {
  return roanuzGet(`tournament/${tournamentKey}/featured-matches/`)
}

export async function getTournamentFixtures(tournamentKey: string, pageKey?: string) {
  const endpoint = pageKey
    ? `tournament/${tournamentKey}/fixtures/?page_key=${pageKey}`
    : `tournament/${tournamentKey}/fixtures/`
  return roanuzGet(endpoint)
}

export async function getTournamentTeam(tournamentKey: string, teamKey: string) {
  return roanuzGet(`tournament/${tournamentKey}/team/${teamKey}/`)
}

export async function getTournamentTables(tournamentKey: string) {
  return roanuzGet(`tournament/${tournamentKey}/tables/`)
}

// --- Stats Endpoints ---

export async function getTournamentStats(tournamentKey: string) {
  return roanuzGet(`tournament/${tournamentKey}/stats/`)
}

export async function getTournamentPlayerStats(tournamentKey: string) {
  return roanuzGet(`tournament/${tournamentKey}/player-stats/`)
}

// --- Odds Endpoints ---

export async function getLiveMatchOdds(matchKey: string) {
  return roanuzGet(`match/${matchKey}/live-match-odds/`)
}

export async function getPreMatchOdds(matchKey: string) {
  return roanuzGet(`match/${matchKey}/pre-match-odds/`)
}

// --- Association Endpoints ---

export async function getCountryList() {
  return roanuzGet('countries/')
}

export async function getAssociations() {
  return roanuzGet('associations/')
}

// --- Graph Endpoints ---

export async function getMatchInsights(matchKey: string) {
  return roanuzGet(`match/${matchKey}/insights/`)
}

export async function getMatchWorm(matchKey: string) {
  return roanuzGet(`match/${matchKey}/worm/`)
}

export async function getMatchManhattan(matchKey: string) {
  return roanuzGet(`match/${matchKey}/manhattan/`)
}

export async function getMatchRunRate(matchKey: string) {
  return roanuzGet(`match/${matchKey}/run-rate/`)
}
