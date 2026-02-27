import { NextRequest, NextResponse } from 'next/server'
import { roanuzGet } from '@/lib/roanuz'
import { getAvailableMatches } from '@/lib/analysis-engine'

/**
 * GET /api/cricket/odds
 *
 * Without ?match param → returns list of live+upcoming matches
 * With ?match=KEY&type=pre|live → returns parsed odds for that match
 *
 * Roanuz v5 endpoints:
 *   Pre-match: /match/{key}/pre-match-odds/
 *   Live:      /match/{key}/live-match-odds/
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchKey = searchParams.get('match')
  const type = searchParams.get('type') || 'pre' // 'pre' or 'live'

  try {
    // ── No match key → return match list ──
    if (!matchKey) {
      const allMatches = await getAvailableMatches()
      const relevant = allMatches
        .filter(
          (m: any) =>
            (m.status === 'live' || m.status === 'upcoming') &&
            m.teamA &&
            m.teamB &&
            !m.name?.includes('TBC')
        )
        .sort((a: any, b: any) => {
          // Live first, then by date
          if (a.status === 'live' && b.status !== 'live') return -1
          if (a.status !== 'live' && b.status === 'live') return 1
          return 0
        })

      return NextResponse.json({
        success: true,
        matches: relevant.map((m: any) => ({
          key: m.key,
          name: m.name,
          teamA: m.teamA,
          teamB: m.teamB,
          status: m.status,
          startDate: m.startDate,
          venue: m.venue,
        })),
      })
    }

    // ── Fetch odds for specific match ──
    const endpoint =
      type === 'live' ? 'live-match-odds' : 'pre-match-odds'

    const raw = await roanuzGet(`match/${matchKey}/${endpoint}/`)
    const matchData = raw?.data?.match || raw?.data || {}

    // Parse teams
    const teamsRaw = matchData.teams || {}
    const teams: Record<
      string,
      { key: string; name: string; code: string }
    > = {}
    for (const [teamKey, teamVal] of Object.entries(teamsRaw) as any[]) {
      teams[teamKey] = {
        key: teamKey,
        name: teamVal.name || teamKey,
        code: teamVal.code || teamVal.alternate_code || teamKey.toUpperCase(),
      }
    }

    // Parse bet_odds
    const betOdds = matchData.bet_odds?.automatic || {}
    const decimalOdds: Record<string, number> = {}
    const fractionalOdds: Record<string, string> = {}

    if (betOdds.decimal && Array.isArray(betOdds.decimal)) {
      for (const item of betOdds.decimal) {
        decimalOdds[item.team_key] = item.value
      }
    }
    if (betOdds.fractional && Array.isArray(betOdds.fractional)) {
      for (const item of betOdds.fractional) {
        fractionalOdds[item.team_key] =
          `${item.numerator}/${item.denominator}`
      }
    }

    // Parse result_prediction
    const prediction = matchData.result_prediction?.automatic || {}
    const winProbability: Record<string, number> = {}

    if (prediction.percentage && Array.isArray(prediction.percentage)) {
      for (const item of prediction.percentage) {
        winProbability[item.team_key] = item.value
      }
    }

    // Parse match meta
    const meta = matchData.meta || {}
    const matchStatus = meta.status || matchData.status || 'unknown'
    const format = meta.format || ''
    const startAt = meta.start_at
      ? new Date(meta.start_at * 1000).toISOString()
      : null

    // Build clean response per team
    const teamOdds = Object.entries(teams).map(([key, team]) => ({
      teamKey: key,
      name: team.name,
      code: team.code,
      decimalOdds: decimalOdds[key] ?? null,
      fractionalOdds: fractionalOdds[key] ?? null,
      winProbability: winProbability[key] ?? null,
    }))

    return NextResponse.json({
      success: true,
      odds: {
        matchKey,
        type,
        status: matchStatus,
        format,
        startAt,
        teams: teamOdds,
      },
    })
  } catch (error: any) {
    const errorMsg =
      error.response?.data?.error?.msg ||
      error.message ||
      'Failed to fetch odds'
    console.error('Odds API error:', errorMsg)
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: error.response?.status || 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
