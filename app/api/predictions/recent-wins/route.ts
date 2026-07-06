import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 1800

// Full-member nations + common women's suffixes — used to surface matches a
// global audience recognises ahead of domestic sides (e.g. Maharaja Trophy).
const INTERNATIONAL_TEAMS = [
  'india', 'england', 'australia', 'south africa', 'new zealand', 'pakistan',
  'sri lanka', 'bangladesh', 'west indies', 'afghanistan', 'ireland', 'zimbabwe',
  'netherlands', 'scotland', 'namibia', 'nepal', 'oman', 'uae', 'usa', 'canada',
]

function isInternational(team: string): boolean {
  const t = team.toLowerCase().replace(/\s+(w|women)$/i, '').trim()
  return INTERNATIONAL_TEAMS.includes(t)
}

export async function GET() {
  try {
    const records = await prisma.matchAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, matchKey: true, teamA: true, teamB: true,
        winProbabilityA: true, winProbabilityB: true,
        confidence: true, rawData: true, createdAt: true,
      },
    })

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

    const enriched = unique.map(r => {
      const raw = r.rawData as any
      const pA = norm(Math.max(0.01, r.winProbabilityA))
      const pB = norm(Math.max(0.01, r.winProbabilityB))
      const total = pA + pB
      const normA = total > 0 ? pA / total : 0.5
      const predictedWinner = normA >= 0.5 ? r.teamA : r.teamB
      const winPct = Math.round(Math.max(normA, 1 - normA) * 100)
      const actualWinner: string | null = raw?.actualWinner || null
      return {
        id: r.id,
        matchKey: r.matchKey,
        teamA: r.teamA,
        teamB: r.teamB,
        predictedWinner,
        winPct,
        confidence: r.confidence,
        isSettled: !!actualWinner,
        isCorrect: !!actualWinner && actualWinner === predictedWinner,
        international: isInternational(r.teamA) && isInternational(r.teamB),
        createdAt: r.createdAt,
      }
    })

    // Honest track record across ALL settled predictions, not just those shown
    const settled = enriched.filter(p => p.isSettled)
    const correct = settled.filter(p => p.isCorrect)
    const stats = {
      settled: settled.length,
      correct: correct.length,
      accuracy: settled.length > 0 ? Math.round((correct.length / settled.length) * 100) : 0,
    }

    // Showcase: recent settled results with a meaningful edge (≥60%), wins and
    // losses alike. Top up with high-confidence pending picks if too few.
    const CARD_COUNT = 8 // 9th grid cell is reserved for the ad
    const strongSettled = settled.filter(p => p.winPct >= 60).slice(0, CARD_COUNT)
    const picks = [...strongSettled]
    if (picks.length < CARD_COUNT) {
      const chosen = new Set(picks.map(p => p.id))
      const pendingStrong = enriched.filter(p =>
        !p.isSettled && !chosen.has(p.id) &&
        ['high', 'very_high'].includes(p.confidence.toLowerCase())
      )
      picks.push(...pendingStrong.slice(0, CARD_COUNT - picks.length))
    }

    // Display order: recognisable international matches first, strongest edge first
    picks.sort((a, b) =>
      Number(b.international) - Number(a.international) || b.winPct - a.winPct
    )

    return NextResponse.json({ success: true, stats, predictions: picks })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, stats: null, predictions: [] })
  }
}
