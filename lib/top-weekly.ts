import { prisma } from './prisma'

export interface TopWeeklyPrediction {
  id: string
  matchKey: string
  teamA: string
  teamB: string
  winProbabilityA: number
  winProbabilityB: number
  predictedWinner: string
  winPct: number
  confidence: string
  venue: string | null
  pitchType: string | null
  tip: string | null
  reasoning: string | null
  createdAt: Date
}

// Shared by app/api/predictions/top-weekly/route.ts and the weekly digest
// email job — a direct function call rather than an HTTP self-call, same
// reasoning as runPredictionGeneration() in lib/scheduler.ts.
export async function getTopWeeklyPredictions(): Promise<TopWeeklyPrediction[]> {
  // Try last 7 days first, fall back to last 50 all-time if empty
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  let records = await prisma.matchAnalysis.findMany({
    where: { createdAt: { gte: oneWeekAgo } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, matchKey: true, teamA: true, teamB: true,
      winProbabilityA: true, winProbabilityB: true,
      confidence: true, reasoning: true, conditions: true, tips: true, createdAt: true,
    },
  })

  if (records.length === 0) {
    records = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, matchKey: true, teamA: true, teamB: true,
        winProbabilityA: true, winProbabilityB: true,
        confidence: true, reasoning: true, conditions: true, tips: true, createdAt: true,
      },
    })
  }

  const seenKeys = new Set<string>()
  const unique = records.filter(r => {
    if (seenKeys.has(r.matchKey)) return false
    seenKeys.add(r.matchKey)
    return true
  })

  const scored = unique.map(r => {
    const gap = Math.abs(r.winProbabilityA - r.winProbabilityB)
    const confScore = r.confidence === 'VERY_HIGH' ? 4 : r.confidence === 'HIGH' ? 3 : r.confidence === 'MEDIUM' ? 2 : 1
    return { ...r, score: gap * confScore }
  }).sort((a, b) => b.score - a.score)

  const DUMMY = new Set(['team a', 'team b', 'teama', 'teamb', 'test', 'unknown'])
  const isDummy = (n: string) => DUMMY.has(n.toLowerCase().trim())
  const norm = (p: number) => p > 1 ? p / 100 : p

  return scored
    .filter(r => !isDummy(r.teamA) && !isDummy(r.teamB))
    .slice(0, 20).map(r => {
      const rawA = norm(Math.max(0.01, r.winProbabilityA))
      const rawB = norm(Math.max(0.01, r.winProbabilityB))
      const total = rawA + rawB
      const pA = total > 0 ? rawA / total : 0.5
      const pB = total > 0 ? rawB / total : 0.5
      const predictedWinner = pA >= pB ? r.teamA : r.teamB
      const winPct = Math.max(pA, pB)
      const conditions = r.conditions as any
      const tips = Array.isArray(r.tips) ? r.tips : []
      return {
        id: r.id,
        matchKey: r.matchKey,
        teamA: r.teamA,
        teamB: r.teamB,
        winProbabilityA: Math.round(pA * 100),
        winProbabilityB: Math.round(pB * 100),
        predictedWinner,
        winPct: Math.round(winPct * 100),
        confidence: r.confidence,
        venue: conditions?.venue || conditions?.ground || null,
        pitchType: conditions?.pitchType || null,
        tip: (tips[0] as string) || null,
        reasoning: typeof r.reasoning === 'string' ? r.reasoning.slice(0, 120) : null,
        createdAt: r.createdAt,
      }
    })
}
