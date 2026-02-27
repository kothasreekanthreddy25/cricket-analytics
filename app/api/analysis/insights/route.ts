import { NextRequest, NextResponse } from 'next/server'
import { getMatchInsights } from '@/lib/roanuz'

export interface H2HMatch {
  key: string
  name: string
  date: string | null
  venue: string | null
  winner: string | null
  teamAScore: string | null
  teamBScore: string | null
  teamAName: string | null
  teamBName: string | null
  resultText: string | null
}

export interface H2HSummary {
  teamA: string
  teamB: string
  teamAWins: number
  teamBWins: number
  noResult: number
  totalMatches: number
  matches: H2HMatch[]
}

/** Safely pick first truthy value from a list of candidate keys on an object */
function pick(obj: any, ...keys: string[]): any {
  if (!obj || typeof obj !== 'object') return null
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return null
}

function parseH2H(data: any, teamA: string, teamB: string): H2HSummary | null {
  if (!data) return null

  // Actual Roanuz key is "recent_h2h" (confirmed from API response)
  const h2hSection =
    data?.recent_h2h ||
    data?.h2h ||
    data?.head_to_head ||
    null

  if (!h2hSection) return null

  // Log full structure for debugging
  console.log('[H2H] recent_h2h type:', Array.isArray(h2hSection) ? 'array' : typeof h2hSection)
  if (!Array.isArray(h2hSection)) {
    console.log('[H2H] recent_h2h keys:', Object.keys(h2hSection))
  }
  console.log('[H2H] recent_h2h (first 500 chars):', JSON.stringify(h2hSection).slice(0, 500))

  // Handle case where recent_h2h is itself a direct array of matches
  let h2hRaw: any = h2hSection
  let rawMatches: any[]

  if (Array.isArray(h2hSection)) {
    // recent_h2h is directly an array of match objects
    rawMatches = h2hSection
    h2hRaw = { matches: h2hSection } // wrap for consistent wins lookup
  } else {
    rawMatches =
      h2hSection.matches ||
      h2hSection.results ||
      h2hSection.recent_matches ||
      h2hSection.data ||
      []
  }

  // Log first match keys if available
  if (rawMatches.length > 0) {
    console.log('[H2H] first match keys:', Object.keys(rawMatches[0]))
  }

  // Take last 5 only
  const last5 = rawMatches.slice(0, 5)

  const matches: H2HMatch[] = last5.map((m: any) => {
    const mTeams: any[] = m.teams || []

    // Scores — try direct fields first, then teams array
    const scoreA =
      pick(m, 'team_a_score', 'score_a', 'team_a_scores') ||
      mTeams[0]?.scores_full ||
      mTeams[0]?.score ||
      mTeams[0]?.scores ||
      null

    const scoreB =
      pick(m, 'team_b_score', 'score_b', 'team_b_scores') ||
      mTeams[1]?.scores_full ||
      mTeams[1]?.score ||
      mTeams[1]?.scores ||
      null

    // Winner key → try result object first, then top-level
    const winnerKey =
      m.result?.winner_team_key ||
      m.result?.winner_key ||
      m.result?.winning_team_key ||
      m.winner_key ||
      m.winner ||
      null

    // Resolve winner key to team name via teams array
    let winnerName: string | null = winnerKey
    if (winnerKey && mTeams.length > 0) {
      const found = mTeams.find(
        (t: any) => t.key === winnerKey || t.team_key === winnerKey
      )
      if (found) winnerName = found.name || found.short_name || winnerKey
    }

    // Date — Unix timestamp or ISO string
    const rawDate = pick(m, 'start_at', 'date', 'start_date', 'match_date')
    let dateStr: string | null = null
    if (rawDate) {
      dateStr = typeof rawDate === 'number'
        ? new Date(rawDate * 1000).toISOString()
        : String(rawDate)
    }

    // Venue — may be object or string
    const venueRaw = pick(m, 'venue', 'ground', 'stadium')
    const venueStr = typeof venueRaw === 'string'
      ? venueRaw
      : venueRaw?.name || venueRaw?.ground_name || null

    return {
      key: m.key || m.match_key || '',
      name: m.name || m.short_name || '',
      date: dateStr,
      venue: venueStr,
      winner: winnerName,
      teamAScore: scoreA ? String(scoreA) : null,
      teamBScore: scoreB ? String(scoreB) : null,
      teamAName: mTeams[0]?.name || mTeams[0]?.short_name || null,
      teamBName: mTeams[1]?.name || mTeams[1]?.short_name || null,
      resultText:
        m.result?.result_str ||
        m.result?.text ||
        m.result?.msg ||
        m.result_text ||
        m.result_str ||
        null,
    }
  })

  // If raw API doesn't have explicit win counts, compute from match results
  const rawAWins = pick(h2hRaw, 'team_a_wins', 'team1_wins', 'teamAWins')
  const rawBWins = pick(h2hRaw, 'team_b_wins', 'team2_wins', 'teamBWins')

  const computedAWins = matches.filter(m => {
    if (!m.winner || !teamA) return false
    const aFirst = teamA.toLowerCase().split(' ')[0]
    return m.winner.toLowerCase().includes(aFirst)
  }).length

  const computedBWins = matches.filter(m => {
    if (!m.winner || !teamB) return false
    const bFirst = teamB.toLowerCase().split(' ')[0]
    return m.winner.toLowerCase().includes(bFirst)
  }).length

  const finalAWins = rawAWins ?? computedAWins
  const finalBWins = rawBWins ?? computedBWins
  const finalTotal = pick(h2hRaw, 'total_matches', 'total', 'count') ?? rawMatches.length

  return {
    teamA,
    teamB,
    teamAWins: finalAWins,
    teamBWins: finalBWins,
    noResult: pick(h2hRaw, 'no_result', 'no_results', 'draw') ?? Math.max(0, finalTotal - finalAWins - finalBWins),
    totalMatches: finalTotal,
    matches,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const matchKey = searchParams.get('match')
  const teamA = searchParams.get('teamA') || ''
  const teamB = searchParams.get('teamB') || ''

  if (!matchKey) {
    return NextResponse.json({ error: 'match param required' }, { status: 400 })
  }

  try {
    const raw = await getMatchInsights(matchKey)
    const data = raw?.data ?? null

    console.log('[Insights] top-level data keys:', data ? Object.keys(data) : 'null')

    const h2h = parseH2H(data, teamA, teamB)

    return NextResponse.json({
      h2h,
      raw: data, // pass through for debugging
    })
  } catch (err: any) {
    console.error('Insights fetch error:', err?.message)
    return NextResponse.json(
      { error: 'Failed to fetch match insights', detail: err?.message },
      { status: 500 }
    )
  }
}
