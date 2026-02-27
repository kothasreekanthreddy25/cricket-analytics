import { NextRequest, NextResponse } from 'next/server'
import { getMatchDetails } from '@/lib/roanuz'
import { cricapiMatchInfo } from '@/lib/cricapi'

export async function GET(
  request: NextRequest,
  { params }: { params: { matchKey: string } }
) {
  // 1. Try Roanuz
  try {
    const data = await getMatchDetails(params.matchKey)
    return NextResponse.json({ source: 'roanuz', ...data })
  } catch {
    console.warn(`[Match] Roanuz failed for ${params.matchKey}, falling back to CricAPI...`)
  }

  // 2. Fallback: CricAPI
  try {
    const match = await cricapiMatchInfo(params.matchKey)
    return NextResponse.json({ source: 'cricapi', data: match })
  } catch (error: any) {
    console.error('Match details error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch match details' }, { status: 500 })
  }
}
