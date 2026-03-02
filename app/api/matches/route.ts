import { NextResponse } from 'next/server'
import { getFeaturedMatches2, getFeaturedTournaments, normalizeRoanuzMatch } from '@/lib/roanuz'

export async function GET() {
  // Primary: Roanuz featured-matches-2
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const matches = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    return NextResponse.json({ success: true, source: 'roanuz', matches })
  } catch {
    console.warn('[Matches] featured-matches-2 failed, trying tournaments...')
  }

  // Fallback: Roanuz featured-tournaments
  try {
    const data = await getFeaturedTournaments()
    return NextResponse.json({ success: true, source: 'roanuz-tournaments', data })
  } catch (error: any) {
    console.error('[Matches] All Roanuz sources failed:', error.message)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 60
