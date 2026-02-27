import { NextRequest, NextResponse } from 'next/server'
import { getTournamentStats, getTournamentPlayerStats } from '@/lib/roanuz'

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentKey: string } }
) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'tournament'

  try {
    const data = type === 'player'
      ? await getTournamentPlayerStats(params.tournamentKey)
      : await getTournamentStats(params.tournamentKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournament stats error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
