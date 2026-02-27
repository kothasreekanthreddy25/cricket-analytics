import { NextRequest, NextResponse } from 'next/server'
import { getMatchDetails, getMatchBallByBall } from '@/lib/roanuz'
import { cricapiMatchInfo, cricapiScorecard } from '@/lib/cricapi'

export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  // 1. Try Roanuz (primary)
  try {
    const [matchData, ballData] = await Promise.allSettled([
      getMatchDetails(params.matchKey),
      getMatchBallByBall(params.matchKey),
    ])

    const match = matchData.status === 'fulfilled' ? matchData.value : null
    const ballByBall = ballData.status === 'fulfilled' ? ballData.value : null

    if (match) {
      return NextResponse.json({
        source: 'roanuz',
        match,
        ballByBall,
        matchError: matchData.status === 'rejected' ? matchData.reason?.message : null,
        ballByBallError: ballData.status === 'rejected' ? ballData.reason?.message : null,
      })
    }
  } catch {
    console.warn(`[Live] Roanuz failed for ${params.matchKey}, falling back to CricAPI...`)
  }

  // 2. Fallback: CricAPI
  try {
    const [matchInfo, scorecard] = await Promise.allSettled([
      cricapiMatchInfo(params.matchKey),
      cricapiScorecard(params.matchKey),
    ])

    return NextResponse.json({
      source: 'cricapi',
      match: matchInfo.status === 'fulfilled' ? matchInfo.value : null,
      scorecard: scorecard.status === 'fulfilled' ? scorecard.value : null,
      matchError: matchInfo.status === 'rejected' ? matchInfo.reason?.message : null,
    })
  } catch (error: any) {
    console.error('Match live data error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch match data' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
