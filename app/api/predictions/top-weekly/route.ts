import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // revalidate every hour

async function getTournamentMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const data = await getFeaturedMatches()
    const matches = (data?.data || []).map(normalizeSportMonksMatch).filter(Boolean) as any[]
    for (const m of matches) {
      if (m.key) map.set(m.key, m.tournamentKey || m.tournament || m.key)
    }
  } catch {}
  return map
}

export async function GET() {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [records, tournamentMap] = await Promise.all([
      prisma.matchAnalysis.findMany({
        where: { createdAt: { gte: oneWeekAgo } },
        orderBy: { winProbabilityA: 'desc' },
        take: 50,
        select: {
          id: true,
          matchKey: true,
          teamA: true,
          teamB: true,
          winProbabilityA: true,
          winProbabilityB: true,
          confidence: true,
          reasoning: true,
          conditions: true,
          tips: true,
          createdAt: true,
        },
      }),
      getTournamentMap(),
    ])

    // Score each prediction by confidence gap (how decisive the prediction is)
    const scored = records.map(r => {
      const gap = Math.abs(r.winProbabilityA - r.winProbabilityB)
      const confScore = r.confidence === 'VERY_HIGH' ? 4 : r.confidence === 'HIGH' ? 3 : r.confidence === 'MEDIUM' ? 2 : 1
      return { ...r, score: gap * confScore }
    })

    // Sort by score, then dedupe so only one match per tournament is kept (highest-scoring one)
    const seenTournaments = new Set<string>()
    const deduped: typeof scored = []
    for (const r of scored.sort((a, b) => b.score - a.score)) {
      const tKey = tournamentMap.get(r.matchKey) || r.matchKey
      if (seenTournaments.has(tKey)) continue
      seenTournaments.add(tKey)
      deduped.push(r)
      if (deduped.length >= 5) break
    }

    const top5 = deduped
      .map(r => {
        const predictedWinner = r.winProbabilityA >= r.winProbabilityB ? r.teamA : r.teamB
        const winPct = Math.max(r.winProbabilityA, r.winProbabilityB)
        const conditions = r.conditions as any
        const tips = Array.isArray(r.tips) ? r.tips : []
        return {
          id: r.id,
          matchKey: r.matchKey,
          teamA: r.teamA,
          teamB: r.teamB,
          winProbabilityA: Math.round(r.winProbabilityA),
          winProbabilityB: Math.round(r.winProbabilityB),
          predictedWinner,
          winPct: Math.round(winPct),
          confidence: r.confidence,
          venue: conditions?.venue || conditions?.ground || null,
          pitchType: conditions?.pitchType || null,
          tip: tips[0] || null,
          reasoning: typeof r.reasoning === 'string' ? r.reasoning.slice(0, 120) : null,
          createdAt: r.createdAt,
        }
      })

    return NextResponse.json({ success: true, predictions: top5 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, predictions: [] })
  }
}
