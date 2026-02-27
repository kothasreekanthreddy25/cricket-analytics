import { NextRequest, NextResponse } from 'next/server'
import { getTournamentFixtures } from '@/lib/roanuz'

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentKey: string } }
) {
  try {
    const pageKey = request.nextUrl.searchParams.get('page_key')
    const data = await getTournamentFixtures(params.tournamentKey, pageKey || undefined)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tournament fixtures error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 })
  }
}
