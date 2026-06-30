import { NextResponse } from 'next/server'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'
import { cricapiCurrentMatches } from '@/lib/cricapi'

/** Dedup key: sorted team names → same match regardless of API source */
function matchDedupeKey(teamA: string, teamB: string) {
  return [teamA, teamB]
    .map(t => t.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, ''))
    .sort()
    .join('|')
}

export async function GET() {
  const [smResult, cricapiResult] = await Promise.allSettled([
    getSportMonksMatches(),
    cricapiCurrentMatches(),
  ])

  const smMatches: any[] = smResult.status === 'fulfilled' ? smResult.value : []
  const cricapiMatches: any[] = cricapiResult.status === 'fulfilled' ? cricapiResult.value : []

  const seen = new Set<string>()
  const merged: any[] = []

  for (const m of smMatches) {
    const key = matchDedupeKey(m.teamA || '', m.teamB || '')
    seen.add(key)
    merged.push({ ...m, dataSource: 'sportmonks' })
  }

  for (const m of cricapiMatches) {
    const key = matchDedupeKey(m.teamA || '', m.teamB || '')
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({ ...m, dataSource: 'cricapi' })
    }
  }

  if (merged.length > 0) {
    return NextResponse.json({
      success: true,
      source: 'merged',
      sportmonksCount: smMatches.length,
      cricapiCount: cricapiMatches.length,
      matches: merged,
    })
  }

  return NextResponse.json({ success: false, error: 'Failed to fetch matches from all sources' }, { status: 500 })
}

async function getSportMonksMatches(): Promise<any[]> {
  try {
    const data = await getFeaturedMatches()
    return (data?.data || []).map(normalizeSportMonksMatch).filter(Boolean)
  } catch {
    return []
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 60
