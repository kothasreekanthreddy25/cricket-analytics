/**
 * GET /api/cricket/ticker
 * Lightweight endpoint for the nav ticker — powered by Roanuz (no quota limits).
 * Attaches stored win probabilities from DB so the ticker never calls the
 * prediction engine at render time.
 */

import { NextResponse } from 'next/server'
import { getFeaturedMatches2, normalizeRoanuzMatch } from '@/lib/roanuz'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const data = await getFeaturedMatches2()
    const rawMatches = data?.data?.matches || []
    const all = rawMatches.map(normalizeRoanuzMatch).filter(Boolean)
    const live = all.filter((m: any) => m.status === 'live')
    const upcoming = all.filter((m: any) => m.status === 'upcoming').slice(0, 8)

    // Look up stored predictions from DB for all ticker matches
    const matchKeys = [...live, ...upcoming]
      .map((m: any) => m.key)
      .filter(Boolean)

    const storedPredictions = matchKeys.length
      ? await prisma.matchAnalysis.findMany({
          where: { matchKey: { in: matchKeys } },
          orderBy: { createdAt: 'desc' },
          distinct: ['matchKey'],
          select: {
            matchKey: true,
            winProbabilityA: true,
            winProbabilityB: true,
            confidence: true,
          },
        })
      : []

    const predMap = new Map(storedPredictions.map((p) => [p.matchKey, p]))

    // Attach prediction data to each match
    const enrich = (m: any) => {
      const pred = predMap.get(m.key)
      return {
        ...m,
        winProbabilityA: pred?.winProbabilityA ?? null,
        winProbabilityB: pred?.winProbabilityB ?? null,
        predictionConfidence: pred?.confidence ?? null,
      }
    }

    console.log(
      `[Ticker] Roanuz: ${live.length} live, ${upcoming.length} upcoming, ${storedPredictions.length} DB predictions attached`
    )

    return NextResponse.json({
      success: true,
      source: 'roanuz',
      live: live.map(enrich),
      upcoming: upcoming.map(enrich),
    })
  } catch (error: any) {
    console.error('[Ticker] failed:', error.message)
    return NextResponse.json({ success: false, live: [], upcoming: [] })
  }
}

export const revalidate = 60
