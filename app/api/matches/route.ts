import { NextResponse } from 'next/server'
import { getFeaturedMatches2, getFeaturedTournaments, normalizeRoanuzMatch } from '@/lib/roanuz'
import { cricapiCurrentMatches } from '@/lib/cricapi'

/** Dedup key: sorted team names → same match regardless of API source */
function matchKey(teamA: string, teamB: string) {
  return [teamA, teamB]
    .map(t => t.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, ''))
    .sort()
    .join('|')
}

export async function GET() {
  // Fetch Roanuz and CricAPI in parallel
  const [roanuzResult, cricapiResult] = await Promise.allSettled([
    getRoanuzMatches(),
    cricapiCurrentMatches(),
  ])

  const roanuzMatches: any[] = roanuzResult.status === 'fulfilled' ? roanuzResult.value.matches : []
  const roanuzSource: string = roanuzResult.status === 'fulfilled' ? roanuzResult.value.source : 'none'
  const cricapiMatches: any[] = cricapiResult.status === 'fulfilled' ? cricapiResult.value : []

  // Build merged list: Roanuz matches first (better live data), then CricAPI-only matches
  const seen = new Set<string>()
  const merged: any[] = []

  for (const m of roanuzMatches) {
    const key = matchKey(m.teamA || '', m.teamB || '')
    seen.add(key)
    merged.push({ ...m, dataSource: 'roanuz' })
  }

  for (const m of cricapiMatches) {
    const key = matchKey(m.teamA || '', m.teamB || '')
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({ ...m, dataSource: 'cricapi' })
    }
  }

  if (merged.length > 0) {
    return NextResponse.json({
      success: true,
      source: 'merged',
      roanuzSource,
      roanuzCount: roanuzMatches.length,
      cricapiCount: cricapiMatches.length,
      matches: merged,
    })
  }

  return NextResponse.json({ success: false, error: 'Failed to fetch matches from all sources' }, { status: 500 })
}

async function getRoanuzMatches(): Promise<{ matches: any[]; source: string }> {
  // Try featured-matches-2 first
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const matches = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    if (matches.length > 0) return { matches, source: 'roanuz-matches' }
  } catch {
    // 403 on current plan — fall through
  }

  // Fall back to tournaments (returns tournament-level data, extract matches if possible)
  try {
    const data = await getFeaturedTournaments()
    const tournaments = data?.data?.tournaments || []
    const matches: any[] = []
    for (const t of tournaments) {
      for (const m of t.matches || []) {
        const normalized = normalizeRoanuzMatch(m)
        if (normalized) matches.push(normalized)
      }
    }
    return { matches, source: 'roanuz-tournaments' }
  } catch {
    return { matches: [], source: 'none' }
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 60
