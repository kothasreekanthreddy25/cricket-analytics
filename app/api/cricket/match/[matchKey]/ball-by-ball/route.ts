import { NextRequest, NextResponse } from 'next/server'
import { getMatchBallByBall } from '@/lib/roanuz'

export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  try {
    const data = await getMatchBallByBall(params.matchKey)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Ball by ball error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch ball by ball data' }, { status: 500 })
  }
}
