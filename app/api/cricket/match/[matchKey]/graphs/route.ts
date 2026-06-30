import { NextRequest, NextResponse } from 'next/server'
import { getLiveScorecard } from '@/lib/sportmonks'

/**
 * GET /api/cricket/match/{matchKey}/graphs
 *
 * Returns scorecard data from SportMonks for worm/run-rate charting on the frontend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  const matchKey = params.matchKey

  try {
    const data = await getLiveScorecard(matchKey)
    const scoreboards = data?.data?.scoreboards?.data || []
    const balls = data?.data?.balls?.data || []

    return NextResponse.json({
      success: true,
      scoreboards,
      balls,
      worm: null,
      manhattan: null,
      runRate: null,
    })
  } catch (error: any) {
    console.error('Graphs API error:', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
