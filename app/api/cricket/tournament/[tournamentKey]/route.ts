import { NextRequest, NextResponse } from 'next/server'
import { getLeague } from '@/lib/sportmonks'

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentKey: string } }
) {
  try {
    const data = await getLeague(params.tournamentKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournament error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 })
  }
}
