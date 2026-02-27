import { NextRequest, NextResponse } from 'next/server'
import { getLiveMatchOdds, getPreMatchOdds } from '@/lib/roanuz'

export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'live'

  try {
    const data = type === 'pre'
      ? await getPreMatchOdds(params.matchKey)
      : await getLiveMatchOdds(params.matchKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Match odds error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch odds' }, { status: 500 })
  }
}
