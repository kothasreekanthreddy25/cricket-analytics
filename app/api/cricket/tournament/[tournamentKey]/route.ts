import { NextRequest, NextResponse } from 'next/server'
import { getTournament } from '@/lib/roanuz'

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentKey: string } }
) {
  try {
    const data = await getTournament(params.tournamentKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournament error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 })
  }
}
