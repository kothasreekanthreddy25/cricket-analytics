import { NextResponse } from 'next/server'
import { getFeaturedMatches2, normalizeRoanuzMatch } from '@/lib/roanuz'
import { cricapiCurrentMatches } from '@/lib/cricapi'

export async function GET() {
  // 1. Roanuz featured-matches-2 (primary — no quota issues)
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const matches = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    const active = matches.filter((m: any) => m.status !== 'completed')
    return NextResponse.json({ source: 'roanuz', matches: active })
  } catch {
    console.warn('[Featured Matches] Roanuz failed, falling back to CricAPI...')
  }

  // 2. Fallback: CricAPI
  try {
    const matches = await cricapiCurrentMatches()
    const active = matches.filter((m) => m != null && m.status !== 'completed')
    return NextResponse.json({ source: 'cricapi', matches: active })
  } catch (error: any) {
    console.error('[Featured Matches] All sources failed:', error.message)
    return NextResponse.json({ error: 'Failed to fetch featured matches' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
