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
import { getMatchDetails, normalizeSportMonksMatch, getRecentFixturesWithLineup, getPlayerCareer } from './sportmonks'
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

// Ground "players to watch" in a real submitted XI instead of asking an AI
// model to recall the current squad from memory (which goes stale — see the
// prompt comments below). Two tiers of ground truth, in priority order:
//   1. ownLineup — THIS match's own SportMonks lineup. Empty until the toss,
//      but once populated it's the actual confirmed XI, not a guess.
//   2. Each team's most recent finished match (from getRecentFixturesWithLineup)
//      as a stand-in "likely XI", clearly labeled as predicted, not confirmed.
export async function getPredictedXIs(
  teamAId: number | null | undefined,
  teamBId: number | null | undefined,
  ownLineup?: any[] | null
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

  // Tier 2 — most recent finished match per team, as a predicted stand-in
  let fixtures: any[] = []
  try {
    const data = await getRecentFixturesWithLineup(120)
    fixtures = (data?.data || [])
      .filter((f: any) => Array.isArray(f.lineup) && f.lineup.length > 0)
      .sort((a: any, b: any) => new Date(b.starting_at).getTime() - new Date(a.starting_at).getTime())
  } catch {
    return empty
  }

  function xiFor(teamId: number | null | undefined): { players: KnownPlayer[]; source: string | null } {
    if (!teamId) return { players: [], source: null }
    const match = fixtures.find((f: any) => f.localteam_id === teamId || f.visitorteam_id === teamId)
    if (!match) return { players: [], source: null }

    const players = lineupToPlayers(match.lineup, teamId)
    if (players.length === 0) return { players: [], source: null }

    const opponentName = match.localteam_id === teamId
      ? (match.visitorteam?.name || 'their opponent')
      : (match.localteam?.name || 'their opponent')
    const source = `vs ${opponentName}, ${new Date(match.starting_at).toDateString()}`
    return { players, source }
  }

  const a = xiFor(teamAId)
  const b = xiFor(teamBId)
  return { teamA: a.players, teamB: b.players, teamASource: a.source, teamBSource: b.source, teamAConfirmed: false, teamBConfirmed: false }
}

// ── Real per-player career stats (batting/bowling) ────────────────────────────
// Replaces AI-guessed "keyStats" strings with actual SportMonks career figures
// for any player we resolved via getPredictedXIs. Aggregates across every
// season chunk SportMonks returns for the matching format (T20/T20I/ODI/Test)
// since career stats come split by season, not as one running total.
export async function getRealPlayerStatBullets(playerId: number, format: string): Promise<string[]> {
  try {
    const data = await getPlayerCareer(String(playerId))
    const career: any[] = data?.data?.career || []
    if (career.length === 0) return []

    // Prefer an exact format match (e.g. "T20I"); fall back to the T20 family
    // for franchise-heavy players, since not everyone has international caps.
    const fmt = (format || 'T20').toUpperCase()
    let entries = career.filter(c => (c.type || '').toUpperCase() === fmt)
    if (entries.length === 0 && fmt.startsWith('T20')) {
      entries = career.filter(c => (c.type || '').toUpperCase().startsWith('T20'))
    }
    if (entries.length === 0) return []

    const bullets: string[] = []

    const battingEntries = entries.map(e => e.batting).filter(Boolean)
    if (battingEntries.length > 0) {
      const matches = battingEntries.reduce((s, b) => s + (b.matches || 0), 0)
      const runs = battingEntries.reduce((s, b) => s + (b.runs_scored || 0), 0)
      const innings = battingEntries.reduce((s, b) => s + (b.innings || 0), 0)
      const notOuts = battingEntries.reduce((s, b) => s + (b.not_outs || 0), 0)
      const balls = battingEntries.reduce((s, b) => s + (b.balls_faced || 0), 0)
      const fifties = battingEntries.reduce((s, b) => s + (b.fifties || 0), 0)
      const hundreds = battingEntries.reduce((s, b) => s + (b.hundreds || 0), 0)
      const dismissals = innings - notOuts
      const avg = dismissals > 0 ? runs / dismissals : runs
      const sr = balls > 0 ? (runs / balls) * 100 : 0
      if (runs > 0) {
        bullets.push(`${runs} runs in ${matches} ${fmt} matches, avg ${avg.toFixed(1)}, SR ${sr.toFixed(1)}`)
        if (fifties > 0 || hundreds > 0) bullets.push(`${hundreds} hundred${hundreds === 1 ? '' : 's'}, ${fifties} fifties`)
      }
    }

    const bowlingEntries = entries.map(e => e.bowling).filter(Boolean)
    if (bowlingEntries.length > 0) {
      const matches = bowlingEntries.reduce((s, b) => s + (b.matches || 0), 0)
      const wickets = bowlingEntries.reduce((s, b) => s + (b.wickets || 0), 0)
      const runsConceded = bowlingEntries.reduce((s, b) => s + (b.runs || 0), 0)
      const overs = bowlingEntries.reduce((s, b) => s + (b.overs || 0), 0)
      const econ = overs > 0 ? runsConceded / overs : 0
      const avg = wickets > 0 ? runsConceded / wickets : 0
      if (wickets > 0) {
        bullets.push(`${wickets} wickets in ${matches} ${fmt} matches, econ ${econ.toFixed(2)}${avg > 0 ? `, avg ${avg.toFixed(1)}` : ''}`)
      }
    }

    return bullets
  } catch {
    return []
  }
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
  "recentForm": {
    "teamA": { "last5": "W W L W W", "trend": "Strong | Inconsistent | Poor", "avgScore": 0 },
    "teamB": { "last5": "L W W L W", "trend": "Strong | Inconsistent | Poor", "avgScore": 0 }
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
