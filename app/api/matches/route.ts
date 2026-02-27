import { NextResponse } from 'next/server'
import { getFeaturedMatches, getFeaturedTournaments } from '@/lib/roanuz'
import { cricapiCurrentMatches } from '@/lib/cricapi'

export async function GET() {
  // 1. Try Roanuz featured-matches (requires higher plan)
  try {
    const data = await getFeaturedMatches()
    return NextResponse.json({ success: true, source: 'roanuz', data })
  } catch {
    console.warn('[Matches] Roanuz featured-matches failed, trying tournaments...')
  }

  // 2. Try Roanuz featured-tournaments (works on basic plan)
  try {
    const data = await getFeaturedTournaments()
    return NextResponse.json({ success: true, source: 'roanuz-tournaments', data })
  } catch {
    console.warn('[Matches] Roanuz tournaments failed, falling back to CricAPI...')
  }

  // 3. Fallback: CricAPI current matches
  try {
    const matches = await cricapiCurrentMatches()
    return NextResponse.json({ success: true, source: 'cricapi', matches })
  } catch (error: any) {
    console.error('[Matches] All sources failed:', error.message)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches from all sources' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 60
