import { NextRequest, NextResponse } from 'next/server'
import { getMatchInfo, getMatchScorecard } from '@/lib/cricket-api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const matchId = params.id
    const [matchInfo, scorecard] = await Promise.all([
      getMatchInfo(matchId),
      getMatchScorecard(matchId),
    ])

    return NextResponse.json({
      success: true,
      data: {
        matchInfo,
        scorecard,
      },
    })
  } catch (error) {
    console.error('Error fetching match details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch match details' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 30 // Revalidate every 30 seconds for live matches
