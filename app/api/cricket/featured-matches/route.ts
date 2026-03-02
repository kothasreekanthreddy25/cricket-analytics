import { NextResponse } from 'next/server'
import { getFeaturedMatches2, normalizeRoanuzMatch } from '@/lib/roanuz'

export async function GET() {
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const matches = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    const active = matches.filter((m: any) => m.status !== 'completed')
    return NextResponse.json({ source: 'roanuz', matches: active })
  } catch (error: any) {
    console.error('[Featured Matches] Roanuz failed:', error.message)
    return NextResponse.json({ error: 'Failed to fetch featured matches' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
