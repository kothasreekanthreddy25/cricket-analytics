import axios from 'axios'

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
  let data: any
  try {
    const response = await axios.post(url, { api_key: API_KEY })
    data = response.data
  } catch (err: any) {
    // Roanuz may return error in response body even with non-200 status
    if (err.response?.data) {
      console.error('Roanuz auth error:', JSON.stringify(err.response.data, null, 2))
    }
    throw new Error(`Roanuz auth failed: ${err.response?.status} - ${JSON.stringify(err.response?.data?.error || err.message)}`)
  }

  console.log('Roanuz auth response:', JSON.stringify(data, null, 2))

  // Response format: { data: { token: "...", expires: 1234567890.123 } }
  cachedToken = data.data?.token || data.token

  // Expires is a Unix timestamp (seconds)
  const expires = data.data?.expires || data.expires
  tokenExpiry = expires ? expires * 1000 : Date.now() + 23 * 60 * 60 * 1000

  if (!cachedToken) {
    console.error('Could not find token in response:', data)
    throw new Error('Failed to get Roanuz auth token')
  }

  console.log('Roanuz token obtained successfully')
  return cachedToken
}

export async function roanuzGet(endpoint: string) {
  const token = await getToken()
  const url = `${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`
  const response = await axios.get(url, {
    headers: { 'rs-token': token },
    timeout: 8000, // 8s timeout — fail fast so CricAPI fallback kicks in quickly
  })
  // Treat 403 (plan restriction) as an error so fallback is triggered
  if (response.data?.error?.http_status_code === 403) {
    throw new Error(`Roanuz 403: ${response.data.error.msg}`)
  }
  return response.data
}

// --- Match Endpoints ---

export async function getFeaturedMatches() {
  return roanuzGet('featured-matches/')
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
