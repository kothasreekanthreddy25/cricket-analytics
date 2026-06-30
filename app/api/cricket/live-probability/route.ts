import { NextRequest, NextResponse } from 'next/server'
import { getMatchOdds } from '@/lib/sportmonks'

/**
 * GET /api/cricket/live-probability?match=KEY
 *
 * Returns win probability for a live match from Roanuz live-match-odds API.
 * Falls back to pre-match-odds if live odds aren't available yet.
 *
 * Response: { success: true, probability: { teamA: { name, pct }, teamB: { name, pct } } }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchKey = searchParams.get('match')

  if (!matchKey) {
    return NextResponse.json(
      { success: false, error: 'match parameter required' },
      { status: 400 }
    )
  }

  try {
    const raw = await getMatchOdds(matchKey)
    const markets: any[] = raw?.data || []

    if (!markets.length) {
      return NextResponse.json({ success: true, probability: null, source: 'unavailable' })
    }

    const market = markets[0]
    const runners: any[] = market.runners || []

    if (runners.length < 2) {
      return NextResponse.json({ success: true, probability: null, source: 'insufficient_data' })
    }

    const totalImplied = runners.reduce((sum: number, r: any) => {
      const price = r.prices?.[0]?.value || r.decimal || 2
      return sum + 1 / price
    }, 0)

    const pctA = Math.round(((1 / (runners[0].prices?.[0]?.value || 2)) / totalImplied) * 100)
    const pctB = Math.round(((1 / (runners[1].prices?.[0]?.value || 2)) / totalImplied) * 100)

    return NextResponse.json({
      success: true,
      probability: {
        teamA: { name: runners[0].name || 'Team A', pct: pctA },
        teamB: { name: runners[1].name || 'Team B', pct: pctB },
      },
      source: 'sportmonks',
    })
  } catch (error: any) {
    console.error('Live probability error:', error.message)
    return NextResponse.json({ success: true, probability: null, source: 'error' })
  }
}

export const dynamic = 'force-dynamic'
