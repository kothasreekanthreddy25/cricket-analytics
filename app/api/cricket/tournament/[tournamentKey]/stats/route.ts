import { NextRequest, NextResponse } from 'next/server'
import { getSeasonStandings } from '@/lib/sportmonks'

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentKey: string } }
) {
  try {
    const data = await getSeasonStandings(params.tournamentKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournament stats error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
