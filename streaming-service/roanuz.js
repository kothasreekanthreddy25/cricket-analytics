/**
 * Roanuz API — Live match data for streaming service
 */
const axios = require('axios')

const BASE_URL    = process.env.ROANUZ_BASE_URL    || 'https://api.sports.roanuz.com/v5'
const PROJECT_KEY = process.env.ROANUZ_PROJECT_KEY || ''
const API_KEY     = process.env.ROANUZ_API_KEY     || ''

let cachedToken = null
let tokenExpiry = 0

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) return cachedToken
  const res = await axios.post(`${BASE_URL}/core/${PROJECT_KEY}/auth/`, { api_key: API_KEY })
  cachedToken = res.data?.data?.token || res.data?.token
  const expires = res.data?.data?.expires || res.data?.expires
  tokenExpiry = expires ? expires * 1000 : Date.now() + 23 * 60 * 60 * 1000
  return cachedToken
}

async function roanuzGet(endpoint) {
  const token = await getToken()
  const res = await axios.get(`${BASE_URL}/cricket/${PROJECT_KEY}/${endpoint}`, {
    headers: { 'rs-token': token },
    timeout: 8000,
  })
  return res.data?.data
}

// ─── Match data ────────────────────────────────────────────────────────────────

async function getMatchData(matchKey) {
  return roanuzGet(`match/${matchKey}/`)
}

async function getBallByBall(matchKey) {
  return roanuzGet(`match/${matchKey}/ball-by-ball/`)
}

// ─── Score text + innings context ─────────────────────────────────────────────

/**
 * Build score text and innings context strings.
 *
 * Returns:
 *   scoreText      — "India: 156/4 in 18.2  |  Australia: yet to bat"
 *   contextText    — "PROJECTED TOTAL: 178-195  (CRR 8.52)" (1st inn)
 *                    "TARGET 195 | NEED 67 off 42b | RRR 9.6" (2nd inn)
 *   teamA / teamB  — team names
 *   striker / nonStriker / bowler — current player objects { name, runs, balls, ... }
 *   strikerKey / nonStrikerKey    — Roanuz player keys for career-stat lookup
 *   tournamentKey  — tournament key (for tournament stats)
 *   status         — match status
 */
async function getScoreText(matchKey) {
  try {
    const data = await getMatchData(matchKey)
    const match = data?.match || data
    const teams = match?.teams || {}
    const play  = match?.play  || {}

    const teamAName = teams.a?.name || 'Team A'
    const teamBName = teams.b?.name || 'Team B'

    // Innings: play.innings has keys like a_1, b_1 (Roanuz v5)
    const inningsSource = play.innings || match.innings || {}
    const inningsList   = Object.entries(inningsSource)

    // Build score display text
    const scoreParts = inningsList.map(([key, inn]) => {
      const side = key.startsWith('a') ? teamAName : teamBName
      const scoreStr = inn.score_str || `${inn.runs ?? 0}/${inn.wickets ?? 0}`
      return `${side}: ${scoreStr}`
    })
    const scoreText = scoreParts.join('  |  ') || `${teamAName} vs ${teamBName}`

    // Determine innings context (projected or chase)
    const contextText = buildInningsContext(inningsList, play)

    // Current players: play.live.recent_players (Roanuz v5)
    const recentPlayers = play.live?.recent_players || {}
    const rawStriker    = recentPlayers.striker    || null
    const rawNonStriker = recentPlayers.non_striker || null
    const rawBowler     = recentPlayers.bowler      || null

    const fmtOvers = (o) => Array.isArray(o) ? `${o[0]}.${o[1]}` : (o ?? null)

    const striker = rawStriker ? {
      key:         rawStriker.key || rawStriker.player?.key || null,
      name:        rawStriker.name || rawStriker.player?.name || '',
      runs:        rawStriker.stats?.runs   ?? 0,
      balls:       rawStriker.stats?.balls  ?? 0,
      fours:       rawStriker.stats?.fours  ?? 0,
      sixes:       rawStriker.stats?.sixes  ?? 0,
      strikeRate:  rawStriker.stats?.strike_rate ?? null,
    } : null

    const nonStriker = rawNonStriker ? {
      key:         rawNonStriker.key || rawNonStriker.player?.key || null,
      name:        rawNonStriker.name || rawNonStriker.player?.name || '',
      runs:        rawNonStriker.stats?.runs   ?? 0,
      balls:       rawNonStriker.stats?.balls  ?? 0,
      fours:       rawNonStriker.stats?.fours  ?? 0,
      sixes:       rawNonStriker.stats?.sixes  ?? 0,
      strikeRate:  rawNonStriker.stats?.strike_rate ?? null,
    } : null

    const bowler = rawBowler ? {
      name:     rawBowler.name || rawBowler.player?.name || '',
      overs:    fmtOvers(rawBowler.stats?.overs),
      runs:     rawBowler.stats?.runs    ?? 0,
      wickets:  rawBowler.stats?.wickets ?? 0,
      economy:  rawBowler.stats?.economy ?? null,
    } : null

    return {
      scoreText,
      contextText,
      teamA: teamAName,
      teamB: teamBName,
      status: match?.status || 'live',
      matchEnded: match?.status === 'completed' || match?.status === 'finished' || false,
      tournamentKey: match?.tournament?.key || null,
      striker,
      nonStriker,
      bowler,
      // Raw per-innings totals for score-change detection in index.js
      rawScores: inningsList.map(([key, inn]) => ({
        r: parseInningsRuns(inn),
        w: parseInningsWickets(inn),
        inning: key,
      })),
    }
  } catch (err) {
    console.error('[Roanuz] Score fetch failed:', err.message)
    return {
      scoreText: 'Live Cricket', contextText: 'Match in progress',
      teamA: 'Team A', teamB: 'Team B', status: 'live', matchEnded: false,
      tournamentKey: null, striker: null, nonStriker: null, bowler: null, rawScores: [],
    }
  }
}

/**
 * Extract runs from an innings object.
 * Roanuz v5 sometimes has runs=0/null with the actual score only in score_str
 * e.g. score_str = "169/8 in 20.0"
 */
function parseInningsRuns(inn) {
  if (inn.runs != null && inn.runs > 0) return inn.runs
  // Parse from score_str: "169/8 in 20.0" → 169
  const match = String(inn.score_str || '').match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : (inn.runs ?? 0)
}

/**
 * Extract wickets from an innings object.
 * Falls back to parsing from score_str: "169/8 in 20.0" → 8
 */
function parseInningsWickets(inn) {
  if (inn.wickets != null && inn.wickets >= 0) return inn.wickets
  const match = String(inn.score_str || '').match(/^(\d+)\/(\d+)/)
  return match ? parseInt(match[2], 10) : (inn.wickets ?? 0)
}

/**
 * Calculate innings context string.
 * 1st innings → projected final score range
 * 2nd innings → target / runs needed / required RR
 */
function buildInningsContext(inningsList, play) {
  if (!inningsList || inningsList.length === 0) return 'Match in progress'

  const totalOvers = play.overs_limit || 20  // T20 default

  if (inningsList.length === 1) {
    // First innings — project final score
    const [, inn] = inningsList[0]
    const runs    = parseInningsRuns(inn)
    const oversStr = inn.score_str?.match(/in\s+([0-9.]+)/)?.[1] || '0'
    const oversPlayed = parseFloat(oversStr) || 0
    if (oversPlayed < 1) return '1st Innings in progress'

    const crr = runs / oversPlayed
    const remaining = totalOvers - oversPlayed
    const projLow  = Math.round(runs + crr * remaining * 1.0)
    const projHigh = Math.round(runs + crr * remaining * 1.3)
    return `1st INN — PROJECTED TOTAL: ${projLow}-${projHigh}  (CRR ${crr.toFixed(2)})`
  }

  if (inningsList.length === 2) {
    // Second innings — calculate chase
    const [, firstInn]  = inningsList[0]
    const [, secondInn] = inningsList[1]

    const firstRuns  = parseInningsRuns(firstInn)
    const target     = firstRuns + 1
    const chaseRuns  = parseInningsRuns(secondInn)
    const oversStr   = secondInn.score_str?.match(/in\s+([0-9.]+)/)?.[1] || '0'
    const oversPlayed = parseFloat(oversStr) || 0

    const runsNeeded = Math.max(0, target - chaseRuns)
    const oversLeft  = Math.max(0, totalOvers - oversPlayed)
    const ballsLeft  = Math.round(oversLeft * 6)
    const rrr        = ballsLeft > 0 ? (runsNeeded / (ballsLeft / 6)) : 0

    if (runsNeeded === 0) return `${secondInn.batting_team_key?.toUpperCase() || 'Team B'} WON!`

    return `2nd INN — TARGET ${target}  |  NEED ${runsNeeded} off ${ballsLeft}b  |  RRR ${rrr.toFixed(1)}`
  }

  return 'Match in progress'
}

// ─── Tournament stats ──────────────────────────────────────────────────────────

/**
 * Returns top scorers + wicket takers for ticker overlay.
 * Also returns a playerMap: { playerName_lowercase → { runs, avg, sr, wickets } }
 * for cross-referencing with current batsmen.
 */
async function getTournamentTopStats(tournamentKey) {
  try {
    const data = await roanuzGet(`tournament/${tournamentKey}/player-stats/`)
    const stats = data?.stats || data?.player_stats || data || {}

    const batters = stats.most_runs || stats.batting?.most_runs || []
    const bowlers = stats.most_wickets || stats.bowling?.most_wickets || []

    // Build a name-keyed map for current-batsman cross-reference
    const playerMap = {}
    ;(Array.isArray(batters) ? batters : []).forEach(p => {
      const name = (p.player?.name || p.name || '').toLowerCase()
      if (name) playerMap[name] = {
        runs:    p.runs        ?? p.total_runs  ?? 0,
        avg:     p.batting_avg ?? p.avg         ?? null,
        sr:      p.strike_rate ?? p.sr          ?? null,
        matches: p.matches     ?? null,
      }
    })

    const topScorers = (Array.isArray(batters) ? batters : []).slice(0, 5).map(p => ({
      name: lastName(p.player?.short_name || p.player?.name || p.name || '?'),
      runs: p.runs ?? p.total_runs ?? 0,
    }))

    const topWicketTakers = (Array.isArray(bowlers) ? bowlers : []).slice(0, 5).map(p => ({
      name:    lastName(p.player?.short_name || p.player?.name || p.name || '?'),
      wickets: p.wickets ?? p.total_wickets ?? 0,
    }))

    return { topScorers, topWicketTakers, playerMap }
  } catch (err) {
    console.error('[Roanuz] Tournament stats failed:', err.message)
    return { topScorers: [], topWicketTakers: [], playerMap: {} }
  }
}

// ─── Player career stats ───────────────────────────────────────────────────────

/**
 * Fetch career stats for a player.
 * Returns { careerLine, formLine } for overlay display.
 */
async function getPlayerCareerStats(playerKey) {
  if (!playerKey) return null
  try {
    const data = await roanuzGet(`player/${playerKey}/career-stats/`)
    // Try to find T20I stats
    const formats = data?.career || data?.stats || []
    const t20 = (Array.isArray(formats) ? formats : Object.values(formats))
      .find(f => (f.format || f.type || '').toLowerCase().includes('t20i') ||
                 (f.format || f.type || '').toLowerCase().includes('t20'))

    if (!t20) return null

    const avg = t20.batting?.avg ?? t20.avg ?? null
    const sr  = t20.batting?.sr  ?? t20.sr  ?? null
    const mat = t20.batting?.matches ?? t20.matches ?? null

    if (!avg && !sr) return null

    const careerLine = `Career T20I: Avg ${avg ? Number(avg).toFixed(1) : '-'}  SR ${sr ? Number(sr).toFixed(1) : '-'}` +
      (mat ? `  (${mat} matches)` : '')

    return { careerLine }
  } catch {
    return null  // graceful — career stats are best-effort
  }
}

/**
 * Fetch recent match scores for a player (for "form" display).
 * Returns a string like "Form (last 5): 89, 34, 78, 12, 56"
 */
async function getPlayerRecentForm(playerKey) {
  if (!playerKey) return null
  try {
    const data = await roanuzGet(`player/${playerKey}/recent-matches/`)
    const matches = data?.matches || data?.recent_matches || []
    const scores = (Array.isArray(matches) ? matches : [])
      .slice(0, 5)
      .map(m => m.runs ?? m.batting?.runs ?? m.score ?? '-')
    if (scores.length === 0) return null
    return `Form (last 5): ${scores.join(', ')}`
  } catch {
    return null
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function lastName(name) {
  const parts = String(name || '?').split(' ')
  return parts[parts.length - 1]
}

module.exports = {
  getMatchData,
  getBallByBall,
  getScoreText,
  getTournamentTopStats,
  getPlayerCareerStats,
  getPlayerRecentForm,
}
