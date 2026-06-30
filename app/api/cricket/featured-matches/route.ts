import { NextResponse } from 'next/server'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'

export async function GET() {
  try {
    const data = await getFeaturedMatches()
    const rawMatches = data?.data || []
    const matches = rawMatches.map(normalizeSportMonksMatch).filter(Boolean)
    const active = matches.filter((m: any) => m.status !== 'completed')
    return NextResponse.json({ source: 'sportmonks', matches: active })
  } catch (error: any) {
    console.error('[Featured Matches] SportMonks failed:', error.message)
    return NextResponse.json({ error: 'Failed to fetch featured matches' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
