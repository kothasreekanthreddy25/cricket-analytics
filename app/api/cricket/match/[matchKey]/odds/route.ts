import { NextRequest, NextResponse } from 'next/server'
import { getMatchOdds } from '@/lib/sportmonks'

export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  try {
    const data = await getMatchOdds(params.matchKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Match odds error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch odds' }, { status: 500 })
  }
}
