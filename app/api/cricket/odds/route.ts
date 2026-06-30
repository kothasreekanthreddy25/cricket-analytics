import { NextRequest, NextResponse } from 'next/server'
import { getMatchOdds, getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'
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
    const raw = await getMatchOdds(matchKey)
    const markets: any[] = raw?.data || []

    const teamOdds = markets.flatMap((market: any) =>
      (market.runners || []).map((r: any) => ({
        teamKey: String(r.id),
        name: r.name || '',
        code: '',
        decimalOdds: r.prices?.[0]?.value ?? r.decimal ?? null,
        fractionalOdds: null,
        winProbability: null,
        market: market.name || '',
      }))
    )

    return NextResponse.json({
      success: true,
      odds: {
        matchKey,
        type,
        status: 'unknown',
        format: '',
        startAt: null,
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
