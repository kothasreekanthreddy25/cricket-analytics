import { NextResponse } from 'next/server'
import { getFeaturedMatches2, getFeaturedTournaments, normalizeRoanuzMatch } from '@/lib/roanuz'
import { cricapiCurrentMatches } from '@/lib/cricapi'

export async function GET() {
  // 1. Try Roanuz featured-matches-2 (now works on current plan)
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const matches = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    return NextResponse.json({ success: true, source: 'roanuz', matches })
  } catch {
    console.warn('[Matches] Roanuz featured-matches-2 failed, trying tournaments...')
  }

  // 2. Try Roanuz featured-tournaments (always works)
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
