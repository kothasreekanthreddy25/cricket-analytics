import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const take = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = parseInt(searchParams.get('offset') || '0')

    const [records, total] = await Promise.all([
      prisma.matchAnalysis.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true, matchKey: true, teamA: true, teamB: true,
          winProbabilityA: true, winProbabilityB: true,
          confidence: true, tips: true, conditions: true, rawData: true, createdAt: true,
        },
      }),
      prisma.matchAnalysis.count(),
    ])

    const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'test', 'unknown'])
    const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())
    const norm = (p: number) => p > 1 ? p / 100 : p

    // Dedupe by matchKey, filter dummies
    const seen = new Set<string>()
    const unique = records.filter(r => {
      if (isDummy(r.teamA) || isDummy(r.teamB)) return false
      if (seen.has(r.matchKey)) return false
      seen.add(r.matchKey)
      return true
    })

    const predictions = unique.map(r => {
      const raw = r.rawData as any
      const conditions = r.conditions as any
      const tips = Array.isArray(r.tips) ? r.tips : []
      const pA = norm(Math.max(0.01, r.winProbabilityA))
      const pB = norm(Math.max(0.01, r.winProbabilityB))
      const total = pA + pB
      const normA = total > 0 ? pA / total : 0.5
      const normB = total > 0 ? pB / total : 0.5
      const predictedWinner = normA >= normB ? r.teamA : r.teamB
      const winPct = Math.max(normA, normB)
      const actualWinner: string | null = raw?.actualWinner || null
      const result = actualWinner
        ? actualWinner === predictedWinner ? 'WON' : 'LOST'
        : 'PENDING'

      return {
        id: r.id,
        matchKey: r.matchKey,
        teamA: r.teamA,
        teamB: r.teamB,
        winProbabilityA: Math.round(normA * 100),
        winProbabilityB: Math.round(normB * 100),
        predictedWinner,
        winPct: Math.round(winPct * 100),
        confidence: r.confidence,
        tip: tips[0] || null,
        venue: conditions?.venue || conditions?.ground || null,
        result,
        createdAt: r.createdAt,
      }
    })

    return NextResponse.json({ success: true, predictions, total, hasMore: skip + take < total })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, predictions: [] })
  }
}
