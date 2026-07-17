/**
 * Shared ticker data logic — powers /api/cricket/ticker and is called
 * in-process by /api/stream/auto-detect (avoids a server-to-server HTTP
 * self-fetch, which fails on hosts that can't loop back to their own
 * public domain, e.g. Railway).
 */

import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'
import { prisma } from '@/lib/prisma'

const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'tbd', 'test', 'unknown'])
const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())

async function dbFallbackMatches() {
  const records = await prisma.matchAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80,
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
        tournamentKey: '',
      }
    })
}

export async function getTickerData(): Promise<{ success: boolean; source: string; live: any[]; upcoming: any[] }> {
  try {
    const data = await getFeaturedMatches()
    const rawMatches = data?.data || []
    const all = rawMatches.map(normalizeSportMonksMatch).filter(Boolean)
    const live = all.filter((m: any) => m.status === 'live')
    const upcoming = all.filter((m: any) => m.status === 'upcoming').slice(0, 8)

    if (live.length === 0 && upcoming.length === 0) {
      throw new Error('empty')
    }

    // Look up stored predictions from DB for all ticker matches
    const matchKeys = [...live, ...upcoming].map((m: any) => m.key).filter(Boolean)

    const storedPredictions = matchKeys.length
      ? await prisma.matchAnalysis.findMany({
          where: { matchKey: { in: matchKeys } },
          orderBy: { createdAt: 'desc' },
          distinct: ['matchKey'],
          select: { matchKey: true, winProbabilityA: true, winProbabilityB: true, confidence: true },
        })
      : []

    const predMap = new Map(storedPredictions.map((p) => [p.matchKey, p]))
    const enrich = (m: any) => {
      const pred = predMap.get(m.key)
      return { ...m, winProbabilityA: pred?.winProbabilityA ?? null, winProbabilityB: pred?.winProbabilityB ?? null, predictionConfidence: pred?.confidence ?? null }
    }

    return { success: true, source: 'sportmonks', live: live.map(enrich), upcoming: upcoming.map(enrich) }
  } catch {
    // Fallback to DB predictions
    try {
      const dbMatches = await dbFallbackMatches()
      const upcoming = dbMatches.slice(0, 8)
      return { success: true, source: 'db', live: [], upcoming }
    } catch (e: any) {
      console.error('[Ticker] DB fallback failed:', e.message)
      return { success: false, source: 'none', live: [], upcoming: [] }
    }
  }
}
