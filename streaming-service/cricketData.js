/**
 * Live match data — sourced from crickettips.ai's own working SportMonks-backed
 * API, replacing the dead Roanuz integration (roanuz.js, kept in the repo but
 * unused). Fetches full-live once per poll and caches briefly so a single poll
 * cycle (getScoreText + getBallByBall) doesn't hit the endpoint twice.
 *
 * Exports the same function names/shapes roanuz.js produced so index.js only
 * needed a one-line require swap.
 */
const axios = require('axios')

const CRICKETTIPS_API_URL = process.env.CRICKETTIPS_API_URL || 'https://crickettips.ai'
const CACHE_MS = 5000

const cache = new Map() // matchKey -> { data, fetchedAt }

async function fetchFullLive(matchKey) {
  const cached = cache.get(matchKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached.data
  const res = await axios.get(`${CRICKETTIPS_API_URL}/api/cricket/match/${matchKey}/full-live`, { timeout: 10000 })
  const data = res.data
  cache.set(matchKey, { data, fetchedAt: Date.now() })
  return data
}

async function getMatchData(matchKey) {
  const data = await fetchFullLive(matchKey)
  return { status: data?.match?.status || 'live' }
}

/**
 * currentPlayers from the main app's full-live endpoint is frequently null
 * (a known gap — its own frontend pages don't rely on it either). Derive
 * striker/non-striker/bowler from ballByBall instead, same approach already
 * proven in app/stream/scoreboard/page.tsx and LiveMatchClient.tsx.
 */
function deriveCurrentPlayers(ballByBall) {
  if (!ballByBall || ballByBall.length === 0) return { striker: null, nonStriker: null, bowler: null }

  // Build stats + dismissal state first, in chronological order, so the
  // "who's currently batting" pass below can exclude anyone already out.
  const batterStats = {}
  const bowlerStats = {}
  for (const b of [...ballByBall].reverse()) {
    if (b.batsman) {
      if (!batterStats[b.batsman]) batterStats[b.batsman] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false }
      batterStats[b.batsman].runs += b.batsmanRuns ?? b.runs ?? 0
      batterStats[b.batsman].balls++
      if (b.isFour) batterStats[b.batsman].fours++
      if (b.isSix) batterStats[b.batsman].sixes++
    }
    if (b.isWicket) {
      const dismissedName = b.dismissedPlayer || b.batsman
      if (dismissedName) {
        if (!batterStats[dismissedName]) batterStats[dismissedName] = { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false }
        batterStats[dismissedName].dismissed = true
      }
    }
    if (b.bowler) {
      if (!bowlerStats[b.bowler]) bowlerStats[b.bowler] = { runs: 0, balls: 0, wickets: 0 }
      bowlerStats[b.bowler].runs += b.runs ?? 0
      bowlerStats[b.bowler].balls++
      if (b.isWicket) bowlerStats[b.bowler].wickets++
    }
  }

  const seen = new Set()
  const recentBatters = []
  for (const b of ballByBall.slice(0, 30)) {
    const n = b.batsman
    if (n && !seen.has(n) && !batterStats[n]?.dismissed) {
      seen.add(n)
      recentBatters.push(n)
      if (recentBatters.length === 2) break
    }
  }
  const currentBowlerName = ballByBall.find(b => b.bowler)?.bowler ?? null

  const toPlayer = (name) => {
    if (!name) return null
    const s = batterStats[name] ?? { runs: 0, balls: 0, fours: 0, sixes: 0 }
    return {
      name,
      runs: s.runs,
      balls: s.balls,
      fours: s.fours,
      sixes: s.sixes,
      strikeRate: s.balls > 0 ? (s.runs / s.balls) * 100 : 0,
    }
  }

  const bowler = currentBowlerName ? (() => {
    const s = bowlerStats[currentBowlerName] ?? { runs: 0, balls: 0, wickets: 0 }
    const fullOvers = Math.floor(s.balls / 6)
    const remBalls = s.balls % 6
    return {
      name: currentBowlerName,
      overs: remBalls > 0 ? `${fullOvers}.${remBalls}` : `${fullOvers}`,
      runs: s.runs,
      wickets: s.wickets,
      economy: s.balls > 0 ? (s.runs / s.balls) * 6 : 0,
    }
  })() : null

  return {
    striker: toPlayer(recentBatters[0]),
    nonStriker: toPlayer(recentBatters[1]),
    bowler,
  }
}

function parseInningsRuns(inn) { return inn?.runs ?? 0 }
function parseInningsWickets(inn) { return inn?.wickets ?? 0 }

/**
 * 1st innings → projected final score range.
 * 2nd+ innings → target / runs needed / required run rate.
 */
function buildInningsContext(innings, totalOvers) {
  if (!innings || innings.length === 0) return 'Match in progress'

  if (innings.length === 1) {
    const inn = innings[0]
    const runs = parseInningsRuns(inn)
    const oversPlayed = parseFloat(String(inn.overs ?? '0')) || 0
    if (oversPlayed < 1) return '1st Innings in progress'
    const crr = runs / oversPlayed
    const remaining = totalOvers - oversPlayed
    const projLow = Math.round(runs + crr * remaining * 1.0)
    const projHigh = Math.round(runs + crr * remaining * 1.3)
    return `1st INN — PROJECTED TOTAL: ${projLow}-${projHigh}  (CRR ${crr.toFixed(2)})`
  }

  const first = innings[0]
  const second = innings[innings.length - 1]
  const firstRuns = parseInningsRuns(first)
  const target = firstRuns + 1
  const chaseRuns = parseInningsRuns(second)
  const oversPlayed = parseFloat(String(second.overs ?? '0')) || 0
  const runsNeeded = Math.max(0, target - chaseRuns)
  const oversLeft = Math.max(0, totalOvers - oversPlayed)
  const ballsLeft = Math.round(oversLeft * 6)
  const rrr = ballsLeft > 0 ? (runsNeeded / (ballsLeft / 6)) : 0

  if (runsNeeded === 0) return `${second.battingTeam || 'Chasing team'} WON!`
  return `2nd INN — TARGET ${target}  |  NEED ${runsNeeded} off ${ballsLeft}b  |  RRR ${rrr.toFixed(1)}`
}

async function getScoreText(matchKey, teamA = '', teamB = '') {
  try {
    const data = await fetchFullLive(matchKey)
    const match = data?.match
    if (!match) throw new Error('empty full-live response')

    const teamAName = match.teams?.a?.name || teamA || 'Team A'
    const teamBName = match.teams?.b?.name || teamB || 'Team B'
    const innings = match.innings || []

    const scoreParts = innings.map(inn => {
      const side = inn.teamSide === 'a' ? teamAName : teamBName
      const scoreStr = inn.scoreStr || `${inn.runs ?? 0}/${inn.wickets ?? 0}`
      return `${side}: ${scoreStr}`
    })
    const scoreText = scoreParts.join('  |  ') || `${teamAName} vs ${teamBName}`

    const totalOvers = /odi/i.test(match.format || '') ? 50 : 20
    const contextText = buildInningsContext(innings, totalOvers)

    const { striker, nonStriker, bowler } = deriveCurrentPlayers(data?.ballByBall)

    return {
      scoreText,
      contextText,
      teamA: teamAName,
      teamB: teamBName,
      status: match.status || 'live',
      matchEnded: match.status === 'completed' || match.status === 'finished',
      tournamentKey: null,
      striker,
      nonStriker,
      bowler,
      rawScores: innings.map(inn => ({
        r: parseInningsRuns(inn),
        w: parseInningsWickets(inn),
        inning: inn.key,
      })),
    }
  } catch (err) {
    console.error('[CricketData] Score fetch failed:', err.message)
    return {
      scoreText: 'Live Cricket', contextText: 'Match in progress',
      teamA: teamA || 'Team A', teamB: teamB || 'Team B', status: 'live', matchEnded: false,
      tournamentKey: null, striker: null, nonStriker: null, bowler: null, rawScores: [],
    }
  }
}

/**
 * Returns balls already normalised (newest first), unlike roanuz.js's raw
 * shape — index.js consumes this directly, no extractBalls() parsing step.
 */
async function getBallByBall(matchKey) {
  const data = await fetchFullLive(matchKey)
  const balls = data?.ballByBall || []
  return balls.map(b => ({
    over: b.over ?? 0,
    ball: b.ball ?? 0,
    uniqueKey: `${b.over}.${b.ball}`,
    runs: b.runs ?? 0,
    batsman: b.batsman || 'Batsman',
    bowler: b.bowler || 'Bowler',
    isWicket: !!b.isWicket,
    wicketType: b.wicketType || (b.isWicket ? 'OUT' : null),
    isSix: !!b.isSix,
    isFour: !!b.isFour,
    milestone: b.milestone || null,
    roanuzComment: b.commentary || null,
  }))
}

// Not available from the main app yet — callers (tournament ticker, player
// career footnotes) already treat empty/null as "hide this element", and
// those specific overlay fields aren't even drawn by ffmpeg-stream.js's
// current layout, so this is a safe no-op rather than a missing feature.
async function getTournamentTopStats() {
  return { topScorers: [], topWicketTakers: [], playerMap: {} }
}
async function getPlayerCareerStats() { return null }
async function getPlayerRecentForm() { return null }

module.exports = {
  getMatchData,
  getBallByBall,
  getScoreText,
  getTournamentTopStats,
  getPlayerCareerStats,
  getPlayerRecentForm,
}
