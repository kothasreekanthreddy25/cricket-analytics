import { NextResponse } from 'next/server'
import { getFeaturedMatches } from '@/lib/roanuz'
import { cricapiCurrentMatches } from '@/lib/cricapi'

export async function GET() {
  // 1. Try Roanuz featured-matches
  try {
    const data = await getFeaturedMatches()
    return NextResponse.json({ source: 'roanuz', ...data })
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