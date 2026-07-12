/**
 * Shared OpenAI + Gemini match-preview generation.
 *
 * Used by both /api/ai/match-preview (curated top-3 teaser) and
 * /api/analysis (on-demand analysis for a specific match, linked from
 * everywhere else on the site). Keeping the prompts in one place means
 * the two surfaces never drift apart.
 */

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './prisma'
import { getMatchDetails, normalizeSportMonksMatch, getRecentFixturesWithLineup, getPlayerCareer, getTeamResults, getFixtureLineup } from './sportmonks'
import { roanuzGet } from './roanuz'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
export const isDummy = (n: string) => DUMMY.has((n || '').toLowerCase().trim())

export interface MatchInfo {
  teamA: string
  teamB: string
  matchKey: string
  tournament: string
  venue: string
  format: string
  startAt: string | null
  // SportMonks numeric team IDs — only set when resolved via SportMonks.
  // Needed to look up each team's real recent lineup (see getPredictedXIs).
  teamAId?: number | null
  teamBId?: number | null
  // The requested match's OWN lineup, straight from SportMonks — populated
  // once the toss happens (empty for not-yet-started matches). When present
  // this is the true confirmed XI, not a "likely XI from last match" guess.
  ownLineup?: any[] | null
}

// Resolve real team/venue/tournament data for ANY matchKey — numeric SportMonks
// fixture IDs (the common case, e.g. from /api/matches), a-rz-- Roanuz keys, or
// slugs already cached in the DB from a previous prediction run.
export async function resolveMatchInfo(matchKey: string): Promise<MatchInfo | null> {
  // 1. SportMonks — works for numeric fixture IDs
  if (/^\d+$/.test(matchKey)) {
    try {
      const data = await getMatchDetails(matchKey)
      const normalized = data?.data ? normalizeSportMonksMatch(data.data) : null
      if (normalized && !isDummy(normalized.teamA) && !isDummy(normalized.teamB)) {
        return {
          teamA: normalized.teamA,
          teamB: normalized.teamB,
          matchKey,
          tournament: normalized.tournament || 'Cricket',
          venue: normalized.venue || '',
          format: normalized.matchType || 'T20',
          startAt: normalized.dateTimeGMT || null,
          teamAId: normalized.teamAId,
          teamBId: normalized.teamBId,
          ownLineup: Array.isArray(data.data.lineup) ? data.data.lineup : null,
        }
      }
    } catch {}
  }

  // 2. Existing DB record — covers Roanuz keys and seeded slugs that already
  // have real team names from a previous prediction-generation run
  try {
    const existing = await prisma.matchAnalysis.findFirst({
      where: { matchKey },
      orderBy: { createdAt: 'desc' },
    })
    if (existing && !isDummy(existing.teamA) && !isDummy(existing.teamB)) {
      const cond = (existing.conditions as any) || {}
      const raw = (existing.rawData as any) || {}
      return {
        teamA: existing.teamA,
        teamB: existing.teamB,
        matchKey,
        tournament: raw.group || cond.tournament || 'Cricket',
        venue: cond.venue || raw.venue || '',
        format: cond.format || 'T20',
        startAt: raw.date || null,
      }
    }
  } catch {}

  // 3. Roanuz — legacy fallback, only reachable if Roanuz access is restored
  try {
    const data = await roanuzGet(`match/${matchKey}/`)
    const match = data?.data?.match || data?.data
    const teamA = match?.teams?.a?.name
    const teamB = match?.teams?.b?.name
    if (teamA && teamB && !isDummy(teamA) && !isDummy(teamB)) {
      return {
        teamA,
        teamB,
        matchKey,
        tournament: match.tournament?.name || 'Cricket',
        venue: match.venue?.name || '',
        format: (match.format || 'T20').toUpperCase(),
        startAt: match.start_at ? new Date(match.start_at * 1000).toISOString() : null,
      }
    }
  } catch {}

  return null
}

export interface KnownPlayer {
  id: number | null
  name: string
  role: string
  isCaptain: boolean
  isWicketkeeper: boolean
}

export interface KnownXIs {
  teamA: KnownPlayer[]
  teamB: KnownPlayer[]
  // Human-readable provenance shown in the UI so it's clear where this list
  // came from — either "confirmed" (this exact match's own submitted lineup,
  // only available once the toss has happened) or a specific past match used
  // as a stand-in "likely XI".
  teamASource: string | null
  teamBSource: string | null
  teamAConfirmed: boolean
  teamBConfirmed: boolean
}

function lineupToPlayers(lineup: any[], teamId: number): KnownPlayer[] {
  return lineup
    .filter((p: any) => p.lineup?.team_id === teamId)
    .map((p: any) => ({
      id: typeof p.id === 'number' ? p.id : null,
      name: p.fullname || `${p.firstname || ''} ${p.lastname || ''}`.trim(),
      role: p.position?.name || 'Player',
      isCaptain: !!p.lineup?.captain,
      isWicketkeeper: !!p.lineup?.wicketkeeper,
    }))
    .filter((p: KnownPlayer) => p.name)
}

// T20 and T20I are the same format under different SportMonks/site naming —
// every other format (ODI, Test) is genuinely distinct, no fallback family.
function formatsMatch(fixtureType: string | undefined, targetFormat: string): boolean {
  const a = (fixtureType || '').toUpperCase()
  const b = targetFormat.toUpperCase()
  if (a === b) return true
  const t20Family = new Set(['T20', 'T20I'])
  return t20Family.has(a) && t20Family.has(b)
}

// Ground "players to watch" in a real submitted XI instead of asking an AI
// model to recall the current squad from memory (which goes stale — see the
// prompt comments below). Two tiers of ground truth, in priority order:
//   1. ownLineup — THIS match's own SportMonks lineup. Empty until the toss,
//      but once populated it's the actual confirmed XI, not a guess.
//   2. Each team's most recent finished match IN THE SAME FORMAT (from
//      getRecentFixturesWithLineup) as a stand-in "likely XI", clearly
//      labeled as predicted, not confirmed. Without the format filter, a
//      team's most recent match of ANY format wins — e.g. an ODI series
//      opener would pull "predicted XI" from that team's last T20I instead,
//      since T20I and ODI squads routinely differ (specialists on one side,
//      not the other).
export async function getPredictedXIs(
  teamAId: number | null | undefined,
  teamBId: number | null | undefined,
  ownLineup?: any[] | null,
  format?: string
): Promise<KnownXIs> {
  const empty: KnownXIs = { teamA: [], teamB: [], teamASource: null, teamBSource: null, teamAConfirmed: false, teamBConfirmed: false }
  if (!teamAId && !teamBId) return empty

  // Tier 1 — confirmed XI for this exact match
  if (ownLineup && ownLineup.length > 0) {
    const teamA = teamAId ? lineupToPlayers(ownLineup, teamAId) : []
    const teamB = teamBId ? lineupToPlayers(ownLineup, teamBId) : []
    if (teamA.length > 0 || teamB.length > 0) {
      return {
        teamA, teamB,
        teamASource: teamA.length > 0 ? 'Confirmed for this match' : null,
        teamBSource: teamB.length > 0 ? 'Confirmed for this match' : null,
        teamAConfirmed: teamA.length > 0,
        teamBConfirmed: teamB.length > 0,
      }
    }
  }

  // Tier 2a — this team's own most recent same-format result (via
  // getTeamResults, scoped server-side to the team), then a targeted
  // single-fixture lineup fetch. Preferred over 2b below because it can't
  // be crowded out by a busy global fixture list — see
  // getRecentFixturesWithLineup's comment for that failure mode, which
  // affected exactly this case (England/India's most recent same-format
  // match sat outside the ~12-day window the old global search could
  // actually reach).
  async function xiForViaTeamResults(teamId: number | null | undefined): Promise<{ players: KnownPlayer[]; source: string | null } | null> {
    if (!teamId) return null
    try {
      const data = await getTeamResults(teamId)
      const results: any[] = data?.data?.results || []
      const match = results
        .filter((f: any) => (f.status === 'Finished' || f.status === 'Completed') && !f.draw_noresult)
        .filter((f: any) => !format || formatsMatch(f.type, format))
        .sort((a: any, b: any) => new Date(b.starting_at).getTime() - new Date(a.starting_at).getTime())[0]
      if (!match) return null

      const lineupData = await getFixtureLineup(match.id)
      const fixture = lineupData?.data
      const lineup = fixture?.lineup
      if (!Array.isArray(lineup) || lineup.length === 0) return null

      const players = lineupToPlayers(lineup, teamId)
      if (players.length === 0) return null

      const opponentName = match.localteam_id === teamId
        ? (fixture?.visitorteam?.name || 'their opponent')
        : (fixture?.localteam?.name || 'their opponent')
      return { players, source: `vs ${opponentName}, ${new Date(match.starting_at).toDateString()}` }
    } catch {
      return null
    }
  }

  const [viaResultsA, viaResultsB] = await Promise.all([xiForViaTeamResults(teamAId), xiForViaTeamResults(teamBId)])

  // Tier 2b — global recent-fixtures search, only for whichever team(s)
  // tier 2a didn't resolve (kept as a fallback rather than removed, since
  // getTeamResults itself could fail or a smaller team's real match might
  // not carry lineup data at all).
  let fixtures: any[] | null = null
  async function xiForGlobalFallback(teamId: number | null | undefined): Promise<{ players: KnownPlayer[]; source: string | null }> {
    if (!teamId) return { players: [], source: null }
    if (fixtures === null) {
      try {
        const data = await getRecentFixturesWithLineup(120)
        fixtures = (data?.data || [])
          .filter((f: any) => Array.isArray(f.lineup) && f.lineup.length > 0)
          .filter((f: any) => !format || formatsMatch(f.type, format))
          .sort((a: any, b: any) => new Date(b.starting_at).getTime() - new Date(a.starting_at).getTime())
      } catch {
        fixtures = []
      }
    }
    const match = (fixtures || []).find((f: any) => f.localteam_id === teamId || f.visitorteam_id === teamId)
    if (!match) return { players: [], source: null }

    const players = lineupToPlayers(match.lineup, teamId)
    if (players.length === 0) return { players: [], source: null }

    const opponentName = match.localteam_id === teamId
      ? (match.visitorteam?.name || 'their opponent')
      : (match.localteam?.name || 'their opponent')
    const source = `vs ${opponentName}, ${new Date(match.starting_at).toDateString()}`
    return { players, source }
  }

  const a = viaResultsA || await xiForGlobalFallback(teamAId)
  const b = viaResultsB || await xiForGlobalFallback(teamBId)
  return { teamA: a.players, teamB: b.players, teamASource: a.source, teamBSource: b.source, teamAConfirmed: false, teamBConfirmed: false }
}

// ── Real per-player career stats (batting/bowling) ────────────────────────────
// Ground truth for both the "players to watch" keyStats bullets AND the
// Fantasy XI value score below. Aggregates across every season chunk
// SportMonks returns for the matching format (T20/T20I/ODI/Test) since career
// stats come split by season, not as one running total.
export interface AggregatedCareerStats {
  battingMatches: number
  runs: number
  battingAvg: number
  strikeRate: number
  fifties: number
  hundreds: number
  bowlingMatches: number
  wickets: number
  economy: number
  bowlingAvg: number
}

const EMPTY_STATS: AggregatedCareerStats = {
  battingMatches: 0, runs: 0, battingAvg: 0, strikeRate: 0, fifties: 0, hundreds: 0,
  bowlingMatches: 0, wickets: 0, economy: 0, bowlingAvg: 0,
}

export async function getAggregatedCareerStats(playerId: number, format: string): Promise<AggregatedCareerStats | null> {
  try {
    const data = await getPlayerCareer(String(playerId))
    const career: any[] = data?.data?.career || []
    if (career.length === 0) return null

    // Prefer an exact format match (e.g. "T20I"); fall back to the T20 family
    // for franchise-heavy players, since not everyone has international caps.
    const fmt = (format || 'T20').toUpperCase()
    let entries = career.filter(c => (c.type || '').toUpperCase() === fmt)
    if (entries.length === 0 && fmt.startsWith('T20')) {
      entries = career.filter(c => (c.type || '').toUpperCase().startsWith('T20'))
    }
    if (entries.length === 0) return null

    const stats = { ...EMPTY_STATS }

    const battingEntries = entries.map(e => e.batting).filter(Boolean)
    if (battingEntries.length > 0) {
      const matches = battingEntries.reduce((s, b) => s + (b.matches || 0), 0)
      const runs = battingEntries.reduce((s, b) => s + (b.runs_scored || 0), 0)
      const innings = battingEntries.reduce((s, b) => s + (b.innings || 0), 0)
      const notOuts = battingEntries.reduce((s, b) => s + (b.not_outs || 0), 0)
      const balls = battingEntries.reduce((s, b) => s + (b.balls_faced || 0), 0)
      const dismissals = innings - notOuts
      stats.battingMatches = matches
      stats.runs = runs
      stats.battingAvg = dismissals > 0 ? runs / dismissals : runs
      stats.strikeRate = balls > 0 ? (runs / balls) * 100 : 0
      stats.fifties = battingEntries.reduce((s, b) => s + (b.fifties || 0), 0)
      stats.hundreds = battingEntries.reduce((s, b) => s + (b.hundreds || 0), 0)
    }

    const bowlingEntries = entries.map(e => e.bowling).filter(Boolean)
    if (bowlingEntries.length > 0) {
      const matches = bowlingEntries.reduce((s, b) => s + (b.matches || 0), 0)
      const wickets = bowlingEntries.reduce((s, b) => s + (b.wickets || 0), 0)
      const runsConceded = bowlingEntries.reduce((s, b) => s + (b.runs || 0), 0)
      const overs = bowlingEntries.reduce((s, b) => s + (b.overs || 0), 0)
      stats.bowlingMatches = matches
      stats.wickets = wickets
      stats.economy = overs > 0 ? runsConceded / overs : 0
      stats.bowlingAvg = wickets > 0 ? runsConceded / wickets : 0
    }

    return stats.runs > 0 || stats.wickets > 0 ? stats : null
  } catch {
    return null
  }
}

function statsToBullets(stats: AggregatedCareerStats | null, fmt: string): string[] {
  if (!stats) return []
  const bullets: string[] = []
  if (stats.runs > 0) {
    bullets.push(`${stats.runs} runs in ${stats.battingMatches} ${fmt} matches, avg ${stats.battingAvg.toFixed(1)}, SR ${stats.strikeRate.toFixed(1)}`)
    if (stats.fifties > 0 || stats.hundreds > 0) {
      bullets.push(`${stats.hundreds} hundred${stats.hundreds === 1 ? '' : 's'}, ${stats.fifties} fifties`)
    }
  }
  if (stats.wickets > 0) {
    bullets.push(`${stats.wickets} wickets in ${stats.bowlingMatches} ${fmt} matches, econ ${stats.economy.toFixed(2)}${stats.bowlingAvg > 0 ? `, avg ${stats.bowlingAvg.toFixed(1)}` : ''}`)
  }
  return bullets
}

export async function getRealPlayerStatBullets(playerId: number, format: string): Promise<string[]> {
  const stats = await getAggregatedCareerStats(playerId, format)
  return statsToBullets(stats, (format || 'T20').toUpperCase())
}

// Bowlers often have a handful of career batting stats too (tail-enders bat
// a little) — statsToBullets always puts batting first, which would surface
// a specialist bowler's meaningless batting average instead of their actual
// wickets/economy. Pick the line that matches why this player was selected.
function primaryStatLine(stats: AggregatedCareerStats | null, fmt: string, role: FantasyRole): string | null {
  if (!stats) return null
  const bowlingLine = stats.wickets > 0
    ? `${stats.wickets} wickets in ${stats.bowlingMatches} ${fmt} matches, econ ${stats.economy.toFixed(2)}${stats.bowlingAvg > 0 ? `, avg ${stats.bowlingAvg.toFixed(1)}` : ''}`
    : null
  const battingLine = stats.runs > 0
    ? `${stats.runs} runs in ${stats.battingMatches} ${fmt} matches, avg ${stats.battingAvg.toFixed(1)}, SR ${stats.strikeRate.toFixed(1)}`
    : null
  if (role === 'BOWL') return bowlingLine || battingLine
  return battingLine || bowlingLine
}

// Overwrite GPT's own "keyStats" guess with real career figures for any
// player found in the known XIs, and attach impact-score/confirmed metadata
// the UI needs. Players GPT named outside the known list (shouldn't happen
// given the prompt constraint, but handled defensively) keep GPT's own
// keyStats string as a single-item bullet list.
export async function enrichPlayersWithRealStats(
  players: any[],
  knownXIs: KnownXIs,
  format: string
): Promise<any[]> {
  const allKnown = [...knownXIs.teamA, ...knownXIs.teamB]
  const byName = new Map(allKnown.map(p => [p.name.toLowerCase().trim(), p]))

  return Promise.all(players.map(async (p) => {
    const known = byName.get((p.name || '').toLowerCase().trim())
    if (known?.id) {
      const bullets = await getRealPlayerStatBullets(known.id, format)
      if (bullets.length > 0) {
        return {
          ...p,
          keyStats: bullets,
          role: known.role || p.role,
          isCaptain: known.isCaptain,
          isWicketkeeper: known.isWicketkeeper,
        }
      }
    }
    return { ...p, keyStats: Array.isArray(p.keyStats) ? p.keyStats : [p.keyStats].filter(Boolean) }
  }))
}

// ── Fantasy XI (free advisory content — deterministic, no AI call) ────────────
// Built entirely from getPredictedXIs + real SportMonks career stats, same
// grounding as playersToWatch. No GPT/Gemini involved in player selection —
// a wrong "recommended pick" is worse here than in narrative commentary, so
// this stays fully deterministic and skips itself rather than guessing.

export type FantasyRole = 'WK' | 'BAT' | 'AR' | 'BOWL'

export interface FantasyPlayer {
  id: number | null
  name: string
  team: string
  role: FantasyRole
  value: number // 0-100, this match's pool only — not comparable across matches
  isCaptain: boolean
  isViceCaptain: boolean
  statLine: string | null
}

export interface FantasyRecommendation {
  xi: FantasyPlayer[]
  captain: FantasyPlayer
  viceCaptain: FantasyPlayer
  reasoning: string[]
  source: string
}

function normalizeFantasyRole(positionName: string): FantasyRole {
  const p = (positionName || '').toLowerCase()
  if (p.includes('keeper')) return 'WK'
  if (p.includes('all')) return 'AR'
  if (p.includes('bowl')) return 'BOWL'
  return 'BAT'
}

// Min-max normalized within this match's own candidate pool (not an absolute
// scale) — a T20I average of 30 and an ODI average of 30 aren't the same
// quality of player, so comparing everyone in the same match/format keeps
// the score meaningful without needing a cross-format calibration model.
function rawFantasyValue(role: FantasyRole, stats: AggregatedCareerStats | null): number {
  if (!stats) return 0
  const battingRaw = stats.runs > 0 ? stats.battingAvg * 0.6 + (stats.strikeRate - 100) * 0.3 : 0
  const bowlingRaw = stats.wickets > 0
    ? (stats.bowlingMatches > 0 ? (stats.wickets / stats.bowlingMatches) * 25 : 0) - stats.economy
    : 0
  if (role === 'BOWL') return Math.max(bowlingRaw, 0)
  if (role === 'AR') return Math.max(battingRaw * 0.6 + bowlingRaw * 0.6, 0)
  if (role === 'WK') return Math.max(battingRaw + 5, 0) // small keeping bonus — not in career batting/bowling data
  return Math.max(battingRaw, 0)
}

export async function buildFantasyXI(
  knownXIs: KnownXIs,
  teamAName: string,
  teamBName: string,
  format: string,
  pitchReport?: { type?: string; dew?: string; tossAdvantage?: string } | null
): Promise<FantasyRecommendation | null> {
  // Both teams need a real lineup — a fantasy pick built on a guessed XI is
  // worse than no pick at all, so this feature simply doesn't render rather
  // than fall back to AI-estimated players.
  if (knownXIs.teamA.length === 0 || knownXIs.teamB.length === 0) return null

  const fmt = (format || 'T20').toUpperCase()
  const candidates = [
    ...knownXIs.teamA.map(p => ({ ...p, team: teamAName })),
    ...knownXIs.teamB.map(p => ({ ...p, team: teamBName })),
  ]

  const withStats = await Promise.all(candidates.map(async (p) => {
    const stats = p.id ? await getAggregatedCareerStats(p.id, fmt) : null
    const role = normalizeFantasyRole(p.role)
    return { ...p, role, stats, raw: rawFantasyValue(role, stats) }
  }))

  const maxRaw = Math.max(1, ...withStats.map(p => p.raw))
  const scored = withStats.map(p => ({ ...p, value: Math.round((p.raw / maxRaw) * 100) }))

  // Fill role minimums first, then top up by score, respecting role maximums.
  const MIN: Record<FantasyRole, number> = { WK: 1, BAT: 3, AR: 1, BOWL: 3 }
  const MAX: Record<FantasyRole, number> = { WK: 2, BAT: 5, AR: 3, BOWL: 5 }
  const byRole: Record<FantasyRole, typeof scored> = { WK: [], BAT: [], AR: [], BOWL: [] }
  for (const p of scored) byRole[p.role].push(p)
  for (const role of Object.keys(byRole) as FantasyRole[]) byRole[role].sort((a, b) => b.value - a.value)

  const chosen: typeof scored = []
  const chosenIds = new Set<string>()
  const pick = (p: (typeof scored)[number]) => {
    const key = `${p.team}:${p.name}`
    if (chosenIds.has(key)) return
    chosenIds.add(key)
    chosen.push(p)
  }

  for (const role of ['BAT', 'BOWL', 'AR', 'WK'] as FantasyRole[]) {
    byRole[role].slice(0, MIN[role]).forEach(pick)
  }

  const remaining = scored
    .filter(p => !chosenIds.has(`${p.team}:${p.name}`))
    .sort((a, b) => b.value - a.value)
  for (const p of remaining) {
    if (chosen.length >= 11) break
    const roleCount = chosen.filter(c => c.role === p.role).length
    if (roleCount >= MAX[p.role]) continue
    pick(p)
  }
  // Best-effort backfill if role caps left us short (small/incomplete squads)
  if (chosen.length < 11) {
    for (const p of remaining) {
      if (chosen.length >= 11) break
      pick(p)
    }
  }

  const xi = chosen
    .slice(0, 11)
    .sort((a, b) => b.value - a.value)
    .map((p): FantasyPlayer => ({
      id: p.id,
      name: p.name,
      team: p.team,
      role: p.role,
      value: p.value,
      isCaptain: false,
      isViceCaptain: false,
      statLine: primaryStatLine(p.stats, fmt, p.role),
    }))

  if (xi.length < 2) return null

  xi[0].isCaptain = true
  xi[1].isViceCaptain = true

  const reasoning: string[] = []
  if (pitchReport?.type === 'Spin-friendly') {
    reasoning.push('Pitch favors spin — spin-bowling all-rounders and strike-rotators are weighted up.')
  } else if (pitchReport?.type === 'Pace-friendly') {
    reasoning.push('Pace-friendly surface — quick bowlers get extra weight in the value score.')
  } else if (pitchReport?.type === 'Batting paradise') {
    reasoning.push('Batting-friendly surface — top-order runs carry more weight than economy here.')
  }
  if (pitchReport?.dew?.toLowerCase().startsWith('yes')) {
    reasoning.push('Dew expected in the second innings — chasing batters get a slight edge over bowlers.')
  }
  reasoning.push(`Captain and vice-captain picked by this match's Fantasy Value Score, computed from real ${fmt} career stats — not a general reputation ranking.`)
  const missingData = withStats.filter(p => !p.stats).length
  if (missingData > 0) {
    reasoning.push(`${missingData} player${missingData === 1 ? '' : 's'} had no recent ${fmt} stats on file and were included on role need only.`)
  }

  return {
    xi,
    captain: xi[0],
    viceCaptain: xi[1],
    reasoning,
    source: 'CricketTips Fantasy Value — computed from SportMonks career stats',
  }
}

// ── Gemini commentator voice ──────────────────────────────────────────────────
// Same squad-currency risk as openaiPreview (see comment there) — captains and
// XIs change often enough that neither model can be trusted to have the live
// answer, so the prompt hedges toward team-level color over confident
// individual/role claims (e.g. "captain of India") that go stale quickly.
export async function geminiCommentatorIntro(teamA: string, teamB: string, tournament: string, venue: string, format: string, matchDateISO?: string | null): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const matchDate = matchDateISO ? new Date(matchDateISO).toDateString() : 'the near future'
  try {
    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(
      `You are a legendary cricket commentator like Richie Benaud or Tony Greig.
Write a dramatic, vivid 2-sentence pre-match introduction specifically for ${teamA} vs ${teamB} in the ${tournament} (${format}), played on ${matchDate}.
Be specific: mention team strengths, playing styles, and recent rivalry moments. No generic phrases.
If you name individual players, only pick ones you are confident are still active internationals
in this format as of ${matchDate} — avoid retired players, and do not assert who the current
captain or vice-captain is (this changes often and you may be out of date); describe their role
or style instead if needed. When in doubt, favor team-level color over a specific player claim.
Family-friendly, broadcast quality.`
    )
    return result.response.text().trim()
  } catch {
    return null
  }
}

// Gemini first (distinct "commentator voice" from the GPT structured data),
// falling back to a quick GPT call if Gemini is unavailable or errors.
export async function getCommentatorIntro(teamA: string, teamB: string, tournament: string, venue: string, format: string, matchDateISO?: string | null): Promise<{ text: string; source: string }> {
  const geminiIntro = await geminiCommentatorIntro(teamA, teamB, tournament, venue, format, matchDateISO)
  if (geminiIntro) return { text: geminiIntro, source: 'Gemini 2.0 Flash' }

  try {
    const fallback = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 100,
      messages: [
        { role: 'system', content: 'Cricket commentator. 2 sentences. Specific to these teams. No generic phrases. Favor team-level color; avoid naming a specific captain/vice-captain since that goes stale quickly.' },
        { role: 'user', content: `Pre-match intro for ${teamA} vs ${teamB}, ${tournament}, ${format} at ${venue || 'the venue'}.` },
      ],
    })
    return { text: fallback.choices[0].message.content || '', source: 'OpenAI GPT-4o' }
  } catch {
    return { text: '', source: 'OpenAI GPT-4o' }
  }
}

// ── OpenAI structured preview — specific to THIS match ───────────────────────
// knownXIs, when available, comes from each team's actual submitted lineup in
// their most recent completed match (see getPredictedXIs) — real data, not
// model recall. When present, the prompt REQUIRES playersToWatch to be
// selected only from those names, which eliminates the retired/wrong-player
// hallucination risk (GPT defaults to "famous name" players from training
// data regardless of retirements — e.g. it kept naming Virat Kohli, who
// retired from T20Is in 2024). When no lineup is available (e.g. a team with
// no recent finished fixture in the lookback window), this falls back to the
// old hedged approach, and the UI surfaces that distinction honestly.
export async function openaiPreview(teamA: string, teamB: string, tournament: string, venue: string, format: string, winContext: string, matchDateISO?: string | null, knownXIs?: KnownXIs | null) {
  const matchDate = matchDateISO ? new Date(matchDateISO).toDateString() : 'the near future'

  const hasKnownA = !!knownXIs?.teamA?.length
  const hasKnownB = !!knownXIs?.teamB?.length
  const knownPlayersBlock = (hasKnownA || hasKnownB)
    ? `
KNOWN PLAYERS — real submitted lineups from each team's most recent completed match (this is
ground-truth data, not your recollection):
${hasKnownA ? `${teamA} (${knownXIs!.teamASource}): ${knownXIs!.teamA.map(p => `${p.name}${p.isCaptain ? ' [captain]' : ''}${p.isWicketkeeper ? ' [wk]' : ''} — ${p.role}`).join(', ')}` : `${teamA}: no recent lineup available — use your best cricket knowledge, but hedge (prefer role/style over confident individual claims).`}
${hasKnownB ? `${teamB} (${knownXIs!.teamBSource}): ${knownXIs!.teamB.map(p => `${p.name}${p.isCaptain ? ' [captain]' : ''}${p.isWicketkeeper ? ' [wk]' : ''} — ${p.role}`).join(', ')}` : `${teamB}: no recent lineup available — use your best cricket knowledge, but hedge (prefer role/style over confident individual claims).`}

For playersToWatch: for any team with a KNOWN PLAYERS list above, you MUST choose both of that
team's entries ONLY from that list — do not invent or substitute a different name, even a famous
one, even if you believe they usually play. The captain/wicketkeeper tags tell you their current
role. For a team with no list, use your own knowledge but hedge as instructed.`
    : `
CRITICAL — squad currency: only name players you are confident are still ACTIVE
international cricketers for this format as of ${matchDate}. Do not default to
"legendary" names out of habit if they have retired, been dropped, or stopped
playing this format — e.g. do not name Virat Kohli or Rohit Sharma for T20I
matches after their 2024 T20I retirements. When unsure whether a well-known
player is still active in this format, prefer a current captain, vice-captain,
or someone you know played for this team in its most recent series instead.`

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_tokens: 1500,
    messages: [
      {
        role: 'system',
        content: `You are a cricket analyst specialising in ${format} cricket.
Generate preview data SPECIFIC to ${teamA} vs ${teamB} in the ${tournament}, being played on ${matchDate}.
Use real cricket knowledge: real historical results between these teams, actual venues.
Do NOT use generic placeholders like "Player A" or "Stadium X".
${knownPlayersBlock}

For impactScore (0-100): rate how much this specific match's context (venue, opponent, format,
recent form) amplifies or reduces this player's expected influence — not just a general reputation
score. Two players with the same career stats can get different scores if one matches up better
against this specific opponent or ground.`,
      },
      {
        role: 'user',
        content: `Generate a detailed pre-match preview for ${teamA} vs ${teamB}.
Tournament: ${tournament}
Format: ${format}
Venue: ${venue || 'TBD'}
Win context: ${winContext}

Return ONLY this JSON (no extra text):
{
  "pitchReport": {
    "venue": "actual stadium name, city",
    "surface": "Dry and dusty | Flat and true | Green-tinged | Hard and bouncy",
    "type": "Spin-friendly | Batting paradise | Pace-friendly | Balanced",
    "avgFirstInnings": 155,
    "chaseSuccessRate": 45,
    "dew": "Yes — dew expected in second innings | No significant dew",
    "expectedBehavior": "2 specific sentences about how this pitch plays for ${format}",
    "tossAdvantage": "BAT | BOWL",
    "tossReason": "specific reason for this venue"
  },
  "playersToWatch": [
    {
      "name": "Real player full name",
      "team": "${teamA}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match — cite the concrete evidence, not just an opinion",
      "keyStats": "real career/recent stats as a short string (may be replaced with verified figures server-side)",
      "threat": "HIGH | MEDIUM",
      "impactScore": 78
    },
    {
      "name": "Real player full name",
      "team": "${teamA}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match — cite the concrete evidence, not just an opinion",
      "keyStats": "real career/recent stats as a short string (may be replaced with verified figures server-side)",
      "threat": "HIGH | MEDIUM",
      "impactScore": 78
    },
    {
      "name": "Real player full name",
      "team": "${teamB}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match — cite the concrete evidence, not just an opinion",
      "keyStats": "real career/recent stats as a short string (may be replaced with verified figures server-side)",
      "threat": "HIGH | MEDIUM",
      "impactScore": 78
    },
    {
      "name": "Real player full name",
      "team": "${teamB}",
      "role": "BAT | BOWL | AR | WK",
      "reason": "specific reason why this player is key in this match — cite the concrete evidence, not just an opinion",
      "keyStats": "real career/recent stats as a short string (may be replaced with verified figures server-side)",
      "threat": "HIGH | MEDIUM",
      "impactScore": 78
    }
  ],
  "teamHistory": {
    "totalMeetings": 0,
    "teamAWins": 0,
    "teamBWins": 0,
    "lastResult": "specific last meeting result",
    "currentStreak": "which team is in better form currently",
    "keyRivalryFact": "interesting real historical fact about ${teamA} vs ${teamB}"
  },
  "prediction": {
    "winner": "${teamA} or ${teamB} (choose one)",
    "confidence": "HIGH | MEDIUM | LOW",
    "margin": "by X runs | by X wickets",
    "winnerProbPct": 60,
    "keyFactor": "the single most important factor deciding this match",
    "xFactor": "one wildcard player/event that could swing it"
  }
}`,
      },
    ],
  })
  return JSON.parse(resp.choices[0].message.content || '{}')
}
