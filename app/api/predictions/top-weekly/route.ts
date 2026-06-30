import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // revalidate every hour

export async function GET() {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const records = await prisma.matchAnalysis.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      orderBy: { winProbabilityA: 'desc' },
      take: 20,
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
    })

    // Score each prediction by confidence gap (how decisive the prediction is)
    const scored = records.map(r => {
      const gap = Math.abs(r.winProbabilityA - r.winProbabilityB)
      const confScore = r.confidence === 'VERY_HIGH' ? 4 : r.confidence === 'HIGH' ? 3 : r.confidence === 'MEDIUM' ? 2 : 1
      return { ...r, score: gap * confScore }
    })

    // Sort by score, take top 5
    const top5 = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
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
