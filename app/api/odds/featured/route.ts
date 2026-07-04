import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 300

// Dummy/test team names to exclude
const DUMMY_NAMES = new Set(['team a', 'team b', 'teama', 'teamb', 'team1', 'team2', 'test', 'unknown'])

function isDummy(name: string) {
  return DUMMY_NAMES.has(name.toLowerCase().trim())
}

// Probabilities may be stored as decimals (0–1) or percentages (1–100)
// Normalise everything to 0–1
function normaliseProb(p: number): number {
  if (p > 1) return p / 100   // stored as percentage e.g. 50.9 → 0.509
  return p                     // already decimal e.g. 0.509
}

function getValueRating(favProb: number, confidence: string): 'STRONG' | 'GOOD' | 'FAIR' | 'AVOID' {
  if (favProb >= 0.70 && (confidence === 'HIGH' || confidence === 'VERY_HIGH')) return 'STRONG'
  if (favProb >= 0.60 && confidence !== 'LOW') return 'GOOD'
  if (favProb >= 0.50) return 'FAIR'
  return 'AVOID'
}

export async function GET() {
  try {
    const analyses = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20, // fetch more so we have enough after filtering dummies
      select: {
        matchKey: true,
        teamA: true,
        teamB: true,
        winProbabilityA: true,
        winProbabilityB: true,
        confidence: true,
        tips: true,
      },
    })

    // Filter out dummy/test records and dedupe by matchKey
    const seen = new Set<string>()
    const real = analyses.filter(a => {
      if (isDummy(a.teamA) || isDummy(a.teamB)) return false
      if (seen.has(a.matchKey)) return false
      seen.add(a.matchKey)
      return true
    })

    const matches = real.slice(0, 6).map(a => {
      // Normalise probabilities to 0–1 range
      const rawA = normaliseProb(Math.max(0.01, a.winProbabilityA))
      const rawB = normaliseProb(Math.max(0.01, a.winProbabilityB))

      // Ensure they sum sensibly — if both are >0.99 something is wrong, clamp
      const total = rawA + rawB
      const probA = total > 0 ? rawA / total : 0.5
      const probB = total > 0 ? rawB / total : 0.5

      // Decimal odds with 5% margin
      const oddsA = parseFloat((1 / (probA * 1.05)).toFixed(2))
      const oddsB = parseFloat((1 / (probB * 1.05)).toFixed(2))

      const favourite = probA >= probB ? a.teamA : a.teamB
      const favProb = Math.max(probA, probB)
      const valueRating = getValueRating(favProb, a.confidence)

      return {
        matchKey: a.matchKey,
        teamA: a.teamA,
        teamB: a.teamB,
        aiOddsA: oddsA,
        aiOddsB: oddsB,
        probA: Math.round(probA * 100),
        probB: Math.round(probB * 100),
        favourite,
        favProb: Math.round(favProb * 100),
        confidence: a.confidence,
        valueRating,
        tip: a.tips || null,
      }
    })

    return NextResponse.json({ matches })
  } catch (e: any) {
    return NextResponse.json({ matches: [] })
  }
}
