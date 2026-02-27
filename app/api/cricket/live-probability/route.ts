import { NextRequest, NextResponse } from 'next/server'
import { roanuzGet } from '@/lib/roanuz'

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
    // Try live odds first, fall back to pre-match
    let matchData: any = null
    let source = 'live'

    try {
      const raw = await roanuzGet(`match/${matchKey}/live-match-odds/`)
      matchData = raw?.data?.match || raw?.data || {}
    } catch {
      // Live odds not available — try pre-match
      try {
        const raw = await roanuzGet(`match/${matchKey}/pre-match-odds/`)
        matchData = raw?.data?.match || raw?.data || {}
        source = 'pre-match'
      } catch {
        return NextResponse.json({
          success: true,
          probability: null,
          source: 'unavailable',
        })
      }
    }

    // Parse teams
    const teamsRaw = matchData.teams || {}
    const teamKeys = Object.keys(teamsRaw)
    const teams: Record<string, { name: string; code: string }> = {}
    for (const [key, val] of Object.entries(teamsRaw) as any[]) {
      teams[key] = {
        name: val.name || key,
        code: val.code || val.alternate_code || key.toUpperCase(),
      }
    }

    // Parse result_prediction percentages
    const prediction = matchData.result_prediction?.automatic || {}
    const winPct: Record<string, number> = {}

    if (prediction.percentage && Array.isArray(prediction.percentage)) {
      for (const item of prediction.percentage) {
        winPct[item.team_key] = item.value
      }
    }

    // Also parse decimal odds as fallback for implied probability
    const betOdds = matchData.bet_odds?.automatic || {}
    const decimalOdds: Record<string, number> = {}
    if (betOdds.decimal && Array.isArray(betOdds.decimal)) {
      for (const item of betOdds.decimal) {
        decimalOdds[item.team_key] = item.value
      }
    }

    // If no direct win% from prediction, calculate from decimal odds
    if (Object.keys(winPct).length === 0 && Object.keys(decimalOdds).length >= 2) {
      const totalImplied = Object.values(decimalOdds).reduce(
        (sum, odds) => sum + 1 / odds,
        0
      )
      for (const [key, odds] of Object.entries(decimalOdds)) {
        winPct[key] = Math.round(((1 / odds) / totalImplied) * 100)
      }
    }

    // Build response — map team keys to teamA/teamB positions
    if (teamKeys.length >= 2 && Object.keys(winPct).length >= 2) {
      const [keyA, keyB] = teamKeys

      return NextResponse.json({
        success: true,
        probability: {
          teamA: {
            key: keyA,
            name: teams[keyA]?.name || keyA,
            code: teams[keyA]?.code || keyA.toUpperCase(),
            pct: winPct[keyA] ?? 50,
          },
          teamB: {
            key: keyB,
            name: teams[keyB]?.name || keyB,
            code: teams[keyB]?.code || keyB.toUpperCase(),
            pct: winPct[keyB] ?? 50,
          },
        },
        source,
      })
    }

    // Not enough data
    return NextResponse.json({
      success: true,
      probability: null,
      source: 'insufficient_data',
    })
  } catch (error: any) {
    console.error('Live probability error:', error.message)
    return NextResponse.json({
      success: true,
      probability: null,
      source: 'error',
    })
  }
}

export const dynamic = 'force-dynamic'
