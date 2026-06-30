import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFeaturedMatches, normalizeSportMonksMatch } from '@/lib/sportmonks'

export const dynamic = 'force-dynamic'
export const revalidate = 1800

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
    const [records, tournamentMap] = await Promise.all([
      prisma.matchAnalysis.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          matchKey: true,
          teamA: true,
          teamB: true,
          winProbabilityA: true,
          winProbabilityB: true,
          confidence: true,
          rawData: true,
          createdAt: true,
        },
      }),
      getTournamentMap(),
    ])

    // Dedupe by matchKey, keep latest
    const seen = new Set<string>()
    const unique = records.filter(r => {
      if (seen.has(r.matchKey)) return false
      seen.add(r.matchKey)
      return true
    })

    // Filter to only correct predictions, then dedupe by tournament (max 1 per tournament)
    const seenTournaments = new Set<string>()
    const wins = unique
      .map(r => {
        const raw = r.rawData as any
        const actualWinner: string | null = raw?.actualWinner || null
        const predictedWinner = r.winProbabilityA >= r.winProbabilityB ? r.teamA : r.teamB
        const winPct = Math.max(r.winProbabilityA, r.winProbabilityB)
        const isCorrect = !!actualWinner && actualWinner === predictedWinner
        const tKey = tournamentMap.get(r.matchKey) || r.matchKey
        return { r, actualWinner, predictedWinner, winPct, isCorrect, tKey }
      })
      .filter(x => x.isCorrect)
      .filter(x => {
        if (seenTournaments.has(x.tKey)) return false
        seenTournaments.add(x.tKey)
        return true
      })
      .slice(0, 9)
      .map(x => ({
        id: x.r.id,
        matchKey: x.r.matchKey,
        teamA: x.r.teamA,
        teamB: x.r.teamB,
        predictedWinner: x.predictedWinner,
        winPct: Math.round(x.winPct),
        confidence: x.r.confidence,
        createdAt: x.r.createdAt,
      }))

    return NextResponse.json({ success: true, predictions: wins })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message, predictions: [] })
  }
}
