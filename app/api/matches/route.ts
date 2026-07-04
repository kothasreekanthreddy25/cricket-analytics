import { NextResponse } from 'next/server'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'
import { cricapiCurrentMatches } from '@/lib/cricapi'
import { prisma } from '@/lib/prisma'

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())

/** Dedup key: sorted team names → same match regardless of API source */
function matchDedupeKey(teamA: string, teamB: string) {
  return [teamA, teamB]
    .map(t => t.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, ''))
    .sort()
    .join('|')
}

async function getDbMatches() {
  const records = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { matchKey: true, teamA: true, teamB: true, conditions: true },
  })

  const seen = new Set<string>()
  return records
    .filter(r => {
      if (isDummy(r.teamA) || isDummy(r.teamB)) return false
      if (seen.has(r.matchKey)) return false
      seen.add(r.matchKey)
      return true
    })
    .map(r => {
      const cond = (r.conditions as any) || {}
      return {
        key: r.matchKey,
        name: `${r.teamA} vs ${r.teamB}`,
        shortName: `${r.teamA} vs ${r.teamB}`,
        teamA: r.teamA,
        teamACode: r.teamA.slice(0, 3).toUpperCase(),
        teamB: r.teamB,
        teamBCode: r.teamB.slice(0, 3).toUpperCase(),
        matchType: cond.format || 'T20',
        status: 'upcoming' as const,
        statusNote: '',
        scoreA: null,
        scoreB: null,
        venue: cond.venue || '',
        date: '',
        dateTimeGMT: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tournament: cond.tournament || 'Cricket',
        tournamentKey: r.matchKey,
        dataSource: 'db',
      }
    })
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
    return NextResponse.json({ success: true, source: 'merged', sportmonksCount: smMatches.length, cricapiCount: cricapiMatches.length, matches: merged })
  }

  // All external APIs failed — fall back to DB
  try {
    const dbMatches = await getDbMatches()
    return NextResponse.json({ success: true, source: 'db', matches: dbMatches })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch matches from all sources' }, { status: 500 })
  }
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
