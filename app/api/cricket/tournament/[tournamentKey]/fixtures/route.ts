import { NextRequest, NextResponse } from 'next/server'
import { getLeagueFixtures } from '@/lib/sportmonks'

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentKey: string } }
) {
  try {
    // tournamentKey is treated as seasonId for SportMonks fixture lookup
    const data = await getLeagueFixtures(params.tournamentKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournament fixtures error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 })
  }
}
